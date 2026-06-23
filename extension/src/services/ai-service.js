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
 * Anti-hallucination: NEVER throws; always returns { ok:false, error, code }.
 *   EMPTY / NETWORK / TIMEOUT / HTTP_<status> / RATE_LIMIT / NO_API_KEY / BAD_JSON
 *
 * v1.9.44.0
 */

import { createLogger } from '../lib/anti-hallucination.js';

const aiLog = createLogger('AIService');
const DEFAULT_BASE_URL = 'https://internal-api.z.ai/v1';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MODEL = 'glm-4.5';

/** Storage key for user-configured API credentials. */
export const AI_CONFIG_KEY = 'aiConfig';

/**
 * Read AI config from chrome.storage.local.
 * Returns { baseUrl, apiKey } with defaults applied.
 */
export async function getAiConfig() {
  try {
    const data = await chrome.storage.local.get(AI_CONFIG_KEY);
    const cfg = data[AI_CONFIG_KEY] || {};
    return {
      baseUrl: cfg.baseUrl || DEFAULT_BASE_URL,
      apiKey: cfg.apiKey || '',
      model: cfg.model || DEFAULT_MODEL,
    };
  } catch (_e) {
    return { baseUrl: DEFAULT_BASE_URL, apiKey: '', model: DEFAULT_MODEL };
  }
}

/**
 * Persist AI config to chrome.storage.local.
 * @param {{ baseUrl?: string, apiKey?: string, model?: string }} partial
 */
export async function setAiConfig(partial) {
  const current = await getAiConfig();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: next });
  aiLog.info('AI config updated (baseUrl=' + next.baseUrl + ', key=' + (next.apiKey ? 'set' : 'empty') + ')');
  return next;
}

/**
 * Quick check whether AI is configured (has API key).
 */
export async function isAiAvailable() {
  const cfg = await getAiConfig();
  return !!cfg.apiKey;
}

/**
 * Send a chat completion request to ZAI API.
 *
 * @param {Object} params
 * @param {Array<{role:string,content:string}>} params.messages
 * @param {string} [params.model] -- defaults to 'glm-4.5'
 * @param {number} [params.temperature] -- 0..2, default 0.7
 * @param {number} [params.timeoutMs] -- default 30000
 * @param {Function} [params.fetchImpl] -- injectable for testing
 * @returns {Promise<{ok:boolean,text?:string,usage?:Object,error?:string,code?:string}>}
 */
export async function sendMessage(params) {
  const messages = params?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array', code: 'BAD_INPUT' };
  }

  const cfg = await getAiConfig();
  if (!cfg.apiKey) {
    return { ok: false, error: 'AI API key not configured', code: 'NO_API_KEY' };
  }

  const body = {
    messages,
    model: params.model || cfg.model,
    temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
    thinking: { type: 'disabled' },
    stream: false,
  };

  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;
  const fetchImpl = params.fetchImpl || globalThis.fetch.bind(globalThis);

  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey,
      },
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

/**
 * Generate a cover letter via AI based on vacancy + resume context.
 *
 * v1.9.50.0 (F-CR-02): Replaced primitive prompt with structured pipeline
 * (scorecard -> evidence -> prompt -> AI -> validate -> tone).
 * Delegates to ../lib/cover-letter-ai.js orchestrator.
 *
 * @param {Object} vacancy -- { title, company, description, keySkills }
 * @param {Object} resume -- { name, position, skills, experience }
 * @param {Object} [opts] -- { tone, fetchImpl }
 * @returns {Promise<{ ok: boolean, text?: string, method?: string, warnings?: string[], error?: string, code?: string }>}
 */
export async function generateCoverLetterAI(vacancy, resume, opts) {
  // Lazy import to avoid circular dep at module load
  const { generateAICoverLetter } = await import('../lib/cover-letter-ai.js');
  return generateAICoverLetter(vacancy, resume, opts);
}

/**
 * Generate N reply variants for a chat with an employer.
 *
 * @param {Array<{role:string,content:string}>} history - chat messages
 * @param {Object} [opts] - { tone, variants: 1|2|3 }
 * @returns {Promise<{ok:boolean,variants?:string[],error?:string,code?:string}>}
 */
export async function generateChatReply(history, opts) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ok: false, error: 'history must be a non-empty array', code: 'BAD_INPUT' };
  }
  const tone = (opts && opts.tone) || 'formal';
  const variants = Math.min(Math.max((opts && opts.variants) || 3, 1), 3);

  const sys = 'You are an assistant helping a job seeker reply to an employer on hh.ru. ' +
    'Write in Russian. Tone: ' + tone + '. ' +
    'Generate ' + variants + ' distinct reply variants, separated by a line containing only "---VARIANT---". ' +
    'Each variant should be 1-3 short sentences. Do not include greetings unless the employer greeted first.';

  const messages = [{ role: 'assistant', content: sys }, ...history];

  const result = await sendMessage({
    messages,
    temperature: 0.8,
    fetchImpl: opts && opts.fetchImpl,
  });
  if (!result.ok) return result;

  const parts = result.text.split(/^---VARIANT---$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Use split parts; if AI ignored separator entirely, parts === [text]
  const list = parts.length > 0 ? parts.slice(0, variants) : [result.text];
  return { ok: true, variants: list };
}
