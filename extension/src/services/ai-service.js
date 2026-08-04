/**
 * SERVICES: AI SERVICE (F4.2)
 * =========================================
 * Thin fetch-based client for chat completions API.
 * Supports multiple providers: Z.ai, Ollama (local), and custom OpenAI-compatible.
 *
 * Provider detection delegated to ai-providers.js.
 *
 * Anti-hallucination: NEVER throws; always returns { ok:false, error, code }.
 *   EMPTY / NETWORK / TIMEOUT / HTTP_<status> / RATE_LIMIT / NO_API_KEY / BAD_JSON
 *
 * v1.9.78.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import {
  PROVIDER_ZAI,
  PROVIDER_OLLAMA,
  PROVIDER_CUSTOM,
  OLLAMA_BASE_URL,
  OLLAMA_DEFAULT_MODEL,
  detectProvider,
  fetchOllamaModels,
} from './ai-providers.js';

export { PROVIDER_ZAI, PROVIDER_OLLAMA, PROVIDER_CUSTOM, fetchOllamaModels };

const aiLog = createLogger('AIService');
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MODEL = 'glm-4.5';
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 180000;

const BUILTIN_DEFAULTS = Object.freeze({
  provider: PROVIDER_ZAI,
  apiKey: 'Z.ai',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiN2U5MjY3YWMtM2Q3MS00ODA4LWI3M2YtZTAzZGViYzVhMzBhIiwiY2hhdF9pZCI6ImNoYXQtNTVkMWFlNzUtMDQ0Ni00NGYwLWIyZmQtMzc3OWEwMTU4MTAwIiwicGxhdGZvcm0iOiJ6YWkifQ.JjoptGFwMQjXuU4afXfqfJ9Cqf2f1q9gKPNSSSvrfS4',
  chatId: 'chat-55d1ae75-0446-44f0-b2fd-3779a0158100',
  userId: '7e9267ac-3d71-4808-b73f-e03debc5a30a',
});

const OLLAMA_DEFAULTS = Object.freeze({
  provider: PROVIDER_OLLAMA,
  apiKey: '',
  token: '',
  chatId: '',
  userId: '',
});

export const AI_CONFIG_KEY = 'aiConfig';

export async function getAiConfig() {
  try {
    const data = await chrome.storage.local.get(AI_CONFIG_KEY);
    const cfg = data[AI_CONFIG_KEY] || {};
    const useDefaults = !cfg.__test_no_defaults;
    const baseUrl = cfg.baseUrl || DEFAULT_BASE_URL;
    const provider = cfg.provider || detectProvider(baseUrl);

    let d;
    if (provider === PROVIDER_OLLAMA) {
      d = useDefaults ? OLLAMA_DEFAULTS : { apiKey: '', token: '', chatId: '', userId: '' };
    } else if (provider === PROVIDER_CUSTOM) {
      d = { apiKey: '', token: '', chatId: '', userId: '' };
    } else {
      d = useDefaults ? BUILTIN_DEFAULTS : { apiKey: '', token: '', chatId: '', userId: '' };
    }

    return {
      provider,
      baseUrl: provider === PROVIDER_OLLAMA ? (cfg.baseUrl || OLLAMA_BASE_URL) : baseUrl,
      apiKey: cfg.apiKey || d.apiKey,
      token: cfg.token || d.token,
      chatId: cfg.chatId || d.chatId,
      userId: cfg.userId || d.userId,
      model: cfg.model || (provider === PROVIDER_OLLAMA ? OLLAMA_DEFAULT_MODEL : DEFAULT_MODEL),
      timeoutMs: clampTimeout(cfg.timeoutMs),
    };
  } catch (_e) {
    return {
      provider: PROVIDER_ZAI,
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

function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(n)));
}

export async function setAiConfig(partial) {
  const current = await getAiConfig();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: next });
  aiLog.info('AI config updated (baseUrl=' + next.baseUrl + ', provider=' + next.provider + ')');
  return next;
}

export async function isAiAvailable() {
  const cfg = await getAiConfig();
  if (cfg.provider === PROVIDER_OLLAMA) return true;
  if (cfg.provider === PROVIDER_CUSTOM) return !!cfg.apiKey;
  return !!(cfg.apiKey && cfg.token);
}

/**
 * Send a chat completion request to the configured AI provider.
 * @param {Object} params
 * @param {Array<{role:string,content:string}>} params.messages
 * @param {string} [params.model]
 * @param {number} [params.temperature] -- 0..2, default 0.7
 * @param {number} [params.timeoutMs]
 * @param {Function} [params.fetchImpl] -- injectable for testing
 * @returns {Promise<{ok:boolean,text?:string,usage?:Object,error?:string,code?:string}>}
 */
export async function sendMessage(params) {
  const messages = params?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array', code: 'BAD_INPUT' };
  }

  const cfg = await getAiConfig();

  if (cfg.provider === PROVIDER_ZAI && (!cfg.apiKey || !cfg.token)) {
    return { ok: false, error: 'AI not configured (apiKey or token missing)', code: 'NO_API_KEY' };
  }
  if (cfg.provider === PROVIDER_CUSTOM && !cfg.apiKey) {
    return { ok: false, error: 'AI not configured (apiKey missing)', code: 'NO_API_KEY' };
  }

  const timeoutMs = clampTimeout(params.timeoutMs || cfg.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const fetchImpl = params.fetchImpl || globalThis.fetch.bind(globalThis);

  // Ollama: use native /api/chat endpoint (no CORS issues)
  if (cfg.provider === PROVIDER_OLLAMA) {
    return sendOllamaNative(messages, params.model || cfg.model, params.temperature, timeoutMs, fetchImpl, cfg.baseUrl);
  }

  // Z.ai and Custom: use OpenAI-compatible /v1/chat/completions
  const body = {
    messages,
    model: params.model || cfg.model,
    temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
    stream: false,
  };
  if (cfg.provider === PROVIDER_ZAI) {
    body.thinking = { type: 'disabled' };
  }

  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';

  const headers = { 'Content-Type': 'application/json' };
  if (cfg.provider === PROVIDER_ZAI) {
    headers['Authorization'] = 'Bearer ' + cfg.apiKey;
    headers['X-Z-AI-From'] = 'Z';
    if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
    if (cfg.userId) headers['X-User-Id'] = cfg.userId;
    if (cfg.token) headers['X-Token'] = cfg.token;
  } else if (cfg.provider === PROVIDER_CUSTOM) {
    headers['Authorization'] = 'Bearer ' + cfg.apiKey;
  }

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

    return { ok: true, text: text.trim(), usage: data.usage || null };
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

/**
 * Send chat completion via Ollama native API (/api/chat).
 * Avoids OpenAI-compatible endpoint CORS issues in Chrome extensions.
 * @param {Array<{role:string,content:string}>} messages
 * @param {string} model
 * @param {number} temperature
 * @param {number} timeoutMs
 * @param {Function} fetchImpl
 * @param {string} baseUrl
 * @returns {Promise<{ok:boolean,text?:string,error?:string,code?:string}>}
 */
async function sendOllamaNative(messages, model, temperature, timeoutMs, fetchImpl, baseUrl) {
  const base = (baseUrl || 'http://localhost:11434').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const url = base + '/api/chat';

  const body = {
    model,
    messages,
    stream: false,
    options: typeof temperature === 'number' ? { temperature } : undefined,
  };

  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      const code = response.status === 429 ? 'RATE_LIMIT' : ('HTTP_' + response.status);
      let errBody = '';
      try { errBody = await response.text(); } catch (_e) { /* ignore */ }
      aiLog.warn('Ollama HTTP ' + response.status + ': ' + errBody.slice(0, 200));
      return { ok: false, error: 'HTTP ' + response.status, code, httpBody: errBody.slice(0, 500) };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return { ok: false, error: 'Invalid JSON from Ollama: ' + e.message, code: 'BAD_JSON' };
    }

    const text = data?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { ok: false, error: 'Ollama returned empty content', code: 'EMPTY', raw: data };
    }

    return { ok: true, text: text.trim() };
  } catch (err) {
    const isAbort = err && (err.name === 'AbortError' || /aborted/i.test(err.message || ''));
    if (isAbort) {
      return { ok: false, error: 'Ollama timeout after ' + timeoutMs + 'ms', code: 'TIMEOUT' };
    }
    aiLog.warn('Ollama network error: ' + (err.message || String(err)));
    return { ok: false, error: err.message || String(err), code: 'NETWORK' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
