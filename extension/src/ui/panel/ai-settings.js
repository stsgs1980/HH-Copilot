/**
 * UI: PANEL -- AI SETTINGS (F5.6)
 * =========================================
 * Loads AI config from background (ai-get-config) and populates the 3 fields
 * in the Settings tab: base URL, API key, model. On input -- debounced save
 * via ai-set-config. Never throws.
 *
 * Why background indirection: ai-service.js owns the storage key + defaults.
 * Calling chrome.runtime.sendMessage keeps the panel decoupled from
 * chrome.storage.local key names.
 *
 * Anti-hallucination:
 *   - Missing chrome.runtime -> { ok:false, code:'NO_BG' }
 *   - BG throws -> { ok:false, code:'BG_THROW' }
 *   - BG returns null -> { ok:false, code:'EMPTY_RESP' }
 *   - Field defaults applied when cfg fields are missing
 *
 * v1.9.48.0
 */

import { refs } from '../state.js';

const DEBOUNCE_MS = 500;
const AI_FIELD_IDS = ['s-ai-base-url', 's-ai-api-key', 's-ai-token', 's-ai-chat-id', 's-ai-user-id', 's-ai-model', 's-ai-timeout'];

/** Send a message to the background script. Injectable for tests. */
async function sendBg(msg, msgImpl) {
  const sender = msgImpl || (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage);
  if (typeof sender !== 'function') {
    return { ok: false, error: 'chrome.runtime.sendMessage unavailable', code: 'NO_BG' };
  }
  return new Promise((resolve) => {
    try {
      sender(msg, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message, code: 'BG_ERR' });
        } else {
          resolve(resp || { ok: false, error: 'No response', code: 'EMPTY_RESP' });
        }
      });
    } catch (e) {
      resolve({ ok: false, error: e.message || String(e), code: 'BG_THROW' });
    }
  });
}

/**
 * Load AI config from background. Returns { ok, config } or { ok:false, error, code }.
 * @param {Function} [msgImpl] -- injectable chrome.runtime.sendMessage for tests
 * @returns {Promise<{ok:boolean, config?:{baseUrl:string,apiKey:string,model:string}, error?:string, code?:string}>}
 */
export async function loadAiConfig(msgImpl) {
  const result = await sendBg({ type: 'ai-get-config' }, msgImpl);
  if (!result || result.ok === false) {
    return { ok: false, error: (result && result.error) || 'BG returned no data', code: (result && result.code) || 'EMPTY_RESP' };
  }
  // ai-service.js getAiConfig returns { baseUrl, apiKey, model } directly
  // (no ok wrapper), but background wraps it as { ok:true, config:{...} } OR
  // returns the config object directly. Handle both shapes.
  const cfg = result.config || (result.baseUrl !== undefined ? result : null);
  if (!cfg) {
    return { ok: false, error: 'BG returned no config', code: 'EMPTY_RESP' };
  }
  return {
    ok: true,
    config: {
      baseUrl: cfg.baseUrl || 'https://internal-api.z.ai/v1',
      apiKey: cfg.apiKey || 'Z.ai',
      token: cfg.token || '',
      chatId: cfg.chatId || '',
      userId: cfg.userId || '',
      model: cfg.model || 'glm-4.5',
      timeoutMs: cfg.timeoutMs || 60000,
    },
  };
}

/**
 * Save partial AI config to background. Merges with existing.
 * @param {{baseUrl?:string, apiKey?:string, model?:string}} partial
 * @param {Function} [msgImpl]
 * @returns {Promise<{ok:boolean, error?:string, code?:string}>}
 */
export async function saveAiConfig(partial, msgImpl) {
  if (!partial || typeof partial !== 'object') {
    return { ok: false, error: 'partial must be an object', code: 'BAD_INPUT' };
  }
  const result = await sendBg({ type: 'ai-set-config', config: partial }, msgImpl);
  if (!result || result.ok === false) {
    return { ok: false, error: (result && result.error) || 'BG save failed', code: (result && result.code) || 'EMPTY_RESP' };
  }
  return { ok: true };
}

/**
 * Populate the 3 AI fields in the Settings tab from stored config.
 * Called once when Settings tab is rendered. Never throws.
 * @param {Function} [msgImpl]
 * @returns {Promise<boolean>} -- true if populated successfully
 */
export async function populateAiFields(msgImpl) {
  const sr = refs.shadowRoot;
  if (!sr) return false;

  const result = await loadAiConfig(msgImpl);
  if (!result.ok) {
    // Set defaults on failure so fields are not empty
    setFieldValue(sr, 's-ai-base-url', 'https://internal-api.z.ai/v1');
    setFieldValue(sr, 's-ai-api-key', 'Z.ai');
    setFieldValue(sr, 's-ai-token', '');
    setFieldValue(sr, 's-ai-chat-id', '');
    setFieldValue(sr, 's-ai-user-id', '');
    setFieldValue(sr, 's-ai-model', 'glm-4.5');
    setFieldValue(sr, 's-ai-timeout', '60000');
    return false;
  }

  setFieldValue(sr, 's-ai-base-url', result.config.baseUrl);
  setFieldValue(sr, 's-ai-api-key', result.config.apiKey);
  setFieldValue(sr, 's-ai-token', result.config.token);
  setFieldValue(sr, 's-ai-chat-id', result.config.chatId);
  setFieldValue(sr, 's-ai-user-id', result.config.userId);
  setFieldValue(sr, 's-ai-model', result.config.model);
  setFieldValue(sr, 's-ai-timeout', String(result.config.timeoutMs || 60000));
  return true;
}

/** Helper: set input value if element exists. */
function setFieldValue(sr, id, value) {
  const el = sr.getElementById(id);
  if (el) el.value = value || '';
}

/** Helper: read input value if element exists, else ''. */
function getFieldValue(sr, id) {
  const el = sr.getElementById(id);
  return el ? (el.value || '') : '';
}

/**
 * Read the AI field values from the DOM into a config object.
 * @returns {{baseUrl:string, apiKey:string, token:string, chatId:string, userId:string, model:string, timeoutMs:number}}
 */
export function readAiFields() {
  const sr = refs.shadowRoot;
  if (!sr) return { baseUrl: '', apiKey: '', token: '', chatId: '', userId: '', model: '', timeoutMs: 60000 };
  const timeoutStr = getFieldValue(sr, 's-ai-timeout');
  const timeoutMs = Number(timeoutStr);
  return {
    baseUrl: getFieldValue(sr, 's-ai-base-url'),
    apiKey: getFieldValue(sr, 's-ai-api-key'),
    token: getFieldValue(sr, 's-ai-token'),
    chatId: getFieldValue(sr, 's-ai-chat-id'),
    userId: getFieldValue(sr, 's-ai-user-id'),
    model: getFieldValue(sr, 's-ai-model'),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 60000,
  };
}

/**
 * Bind debounced save handlers to the 3 AI input fields.
 * Called once from panel/events.js bindAllEvents().
 * @param {Element} container -- the panel container
 * @param {Object} [opts] -- { msgImpl, debounceMs }
 */
export function bindAiSettingsHandlers(container, opts) {
  if (!container) return;
  const msgImpl = opts && opts.msgImpl;
  const debounceMs = (opts && opts.debounceMs) || DEBOUNCE_MS;
  const timers = new Map();

  for (const id of AI_FIELD_IDS) {
    const el = container.querySelector('#' + id);
    if (!el) continue;
    el.addEventListener('input', () => {
      // Reset debounce timer
      if (timers.has(id)) clearTimeout(timers.get(id));
      timers.set(id, setTimeout(() => {
        timers.delete(id);
        const cfg = readAiFields();
        // Only save the changed field's value (partial update)
        const fieldMap = {
          's-ai-base-url': 'baseUrl',
          's-ai-api-key': 'apiKey',
          's-ai-token': 'token',
          's-ai-chat-id': 'chatId',
          's-ai-user-id': 'userId',
          's-ai-model': 'model',
          's-ai-timeout': 'timeoutMs',
        };
        const partial = { [fieldMap[id]]: cfg[fieldMap[id]] };
        saveAiConfig(partial, msgImpl).catch(() => { /* silent fail; field still in DOM */ });
      }, debounceMs));
    });
  }
}

/** Exported for tests. */
export const _internal = {
  AI_FIELD_IDS,
  DEBOUNCE_MS,
  sendBg,
  setFieldValue,
  getFieldValue,
};
