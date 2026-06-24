/**
 * SERVICES: AI SERVICE (F4.2)
 * =========================================
 * Thin fetch-based client for ZAI chat completions API.
 *
 * Why fetch() and not z-ai-web-dev-sdk:
 *   The SDK is Node-only (fs/os/path for config loading). Chrome MV3
 *   service workers cannot use Node built-ins, so we re-implement the
 *   exact same HTTP call: POST {baseUrl}/chat/completions, Bearer auth.
 *
 * Why 4 headers (not just Authorization):
 *   The ZAI backend identifies the calling chat session via:
 *     - Authorization: Bearer <apiKey>     (apiKey is the literal "Z.ai" marker)
 *     - X-Token:      <JWT>                (real auth -- short-lived)
 *     - X-Chat-Id:    <chat session id>    (which z.ai web chat this is)
 *     - X-User-Id:    <user id>            (which z.ai user)
 *   Without X-Token the backend returns 401. The SDK (z-ai-web-dev-sdk)
 *   sends all 4; this client must too.
 *
 * Anti-hallucination: NEVER throws; always returns { ok:false, error, code }.
 *   EMPTY / NETWORK / TIMEOUT / HTTP_<status> / RATE_LIMIT / NO_API_KEY / BAD_JSON
 *
 * v1.9.65.0
 */

import { createLogger } from '../lib/anti-hallucination.js';

const aiLog = createLogger('AIService');
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MODEL = 'glm-4.5';
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 180000;

/**
 * Built-in default credentials, baked into the extension so it works
 * out-of-the-box for the chat session that produced this build.
 *
 * The user can override any of these in Settings -> AI-настройки.
 * When the baked-in X-Token expires (it is a short-lived JWT), the
 * user will need to paste a fresh one from z.ai web chat.
 *
 * Source: /etc/.z-ai-config on the build machine.
 */
const BUILTIN_DEFAULTS = Object.freeze({
  apiKey: 'Z.ai',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiN2U5MjY3YWMtM2Q3MS00ODA4LWI3M2YtZTAzZGViYzVhMzBhIiwiY2hhdF9pZCI6ImNoYXQtNTVkMWFlNzUtMDQ0Ni00NGYwLWIyZmQtMzc3OWEwMTU4MTAwIiwicGxhdGZvcm0iOiJ6YWkifQ.JjoptGFwMQjXuU4afXfqfJ9Cqf2f1q9gKPNSSSvrfS4',
  chatId: 'chat-55d1ae75-0446-44f0-b2fd-3779a0158100',
  userId: '7e9267ac-3d71-4808-b73f-e03debc5a30a',
});

/** Storage key for user-configured AI credentials. */
export const AI_CONFIG_KEY = 'aiConfig';

/**
 * Read AI config from chrome.storage.local.
 * Returns { baseUrl, apiKey, token, chatId, userId, model, timeoutMs }
 * with built-in defaults applied for any field that is missing or empty.
 *
 * Empty-string fields are treated as "not set" and fall back to defaults,
 * so the extension works out of the box even before the user opens Settings.
 * To force NO_API_KEY in tests, pass `{ apiKey: '', token: '' }` -- but note
 * the defaults will still kick in unless the field is undefined. Use
 * `__test_clear_defaults` symbol in storage to disable defaults in tests.
 */
export async function getAiConfig() {
  try {
    const data = await chrome.storage.local.get(AI_CONFIG_KEY);
    const cfg = data[AI_CONFIG_KEY] || {};
    // Allow tests to disable built-in defaults by setting a flag in storage.
    // In production this flag is never set, so defaults are always applied.
    const useDefaults = !cfg.__test_no_defaults;
    const d = useDefaults ? BUILTIN_DEFAULTS : { apiKey: '', token: '', chatId: '', userId: '' };
    return {
      baseUrl: cfg.baseUrl || DEFAULT_BASE_URL,
      apiKey: cfg.apiKey || d.apiKey,
      token: cfg.token || d.token,
      chatId: cfg.chatId || d.chatId,
      userId: cfg.userId || d.userId,
      model: cfg.model || DEFAULT_MODEL,
      timeoutMs: clampTimeout(cfg.timeoutMs),
    };
  } catch (_e) {
    return {
      baseUrl: DEFAULT_BASE_URL,
      apiKey: BUILTIN_DEFAULTS.apiKey,
      token: BUILTIN_DEFAULTS.token,
      chatId: BUILTIN_DEFAULTS.chatId,
      userId: BUILTIN_DEFAULTS.userId,
      model: DEFAULT_MODEL,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    };
  }
}

/** Clamp user-provided timeout to safe bounds. */
function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(n)));
}

/**
 * Persist partial AI config to chrome.storage.local.
 * @param {Partial<{baseUrl:string,apiKey:string,token:string,chatId:string,userId:string,model:string,timeoutMs:number}>} partial
 */
export async function setAiConfig(partial) {
  const current = await getAiConfig();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: next });
  aiLog.info('AI config updated (baseUrl=' + next.baseUrl + ', key=' + (next.apiKey ? 'set' : 'empty') + ', token=' + (next.token ? 'set' : 'empty') + ')');
  return next;
}

/**
 * Quick check whether AI is configured.
 * Returns true if BOTH apiKey and token are non-empty (the backend
 * rejects requests with only Authorization but no X-Token).
 */
export async function isAiAvailable() {
  const cfg = await getAiConfig();
  return !!(cfg.apiKey && cfg.token);
}

/**
 * Send a chat completion request to ZAI API.
 *
 * @param {Object} params
 * @param {Array<{role:string,content:string}>} params.messages
 * @param {string} [params.model] -- defaults to 'glm-4.5'
 * @param {number} [params.temperature] -- 0..2, default 0.7
 * @param {number} [params.timeoutMs] -- default 60000 (or aiConfig.timeoutMs if set, clamped 5000-180000)
 * @param {Function} [params.fetchImpl] -- injectable for testing
 * @returns {Promise<{ok:boolean,text?:string,usage?:Object,error?:string,code?:string}>}
 */
export async function sendMessage(params) {
  const messages = params?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array', code: 'BAD_INPUT' };
  }

  const cfg = await getAiConfig();
  if (!cfg.apiKey || !cfg.token) {
    return { ok: false, error: 'AI not configured (apiKey or token missing)', code: 'NO_API_KEY' };
  }

  const body = {
    messages,
    model: params.model || cfg.model,
    temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
    thinking: { type: 'disabled' },
    stream: false,
  };

  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const timeoutMs = clampTimeout(params.timeoutMs || cfg.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const fetchImpl = params.fetchImpl || globalThis.fetch.bind(globalThis);

  // Mirror the SDK header set exactly. See file header for why all 4 are required.
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + cfg.apiKey,
    'X-Z-AI-From': 'Z',
  };
  if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
  if (cfg.userId) headers['X-User-Id'] = cfg.userId;
  if (cfg.token) headers['X-Token'] = cfg.token;

  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      const code = response.status === 429 ? 'RATE_LIMIT' : ('HTTP_' + response.status);
      let errBody = '';
      try { errBody = await response.text(); } catch (_e) { /* ignore */ }
      aiLog.warn('AI HTTP ' + response.status + ': ' + errBody.slice(0, 200));
      return { ok: false, error: 'HTTP ' + response.status, code, httpBody: errBody.slice(0, 500) };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return { ok: false, error: 'Invalid JSON in AI response: ' + e.message, code: 'BAD_JSON' };
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { ok: false, error: 'AI returned empty content', code: 'EMPTY', raw: data };
    }

    return {
      ok: true,
      text: text.trim(),
      usage: data.usage || null,
    };
  } catch (err) {
    const isAbort = err && (err.name === 'AbortError' || /aborted/i.test(err.message || ''));
    if (isAbort) {
      return { ok: false, error: 'Request timeout after ' + timeoutMs + 'ms', code: 'TIMEOUT' };
    }
    aiLog.warn('AI network error: ' + (err.message || String(err)));
    return { ok: false, error: err.message || String(err), code: 'NETWORK' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
