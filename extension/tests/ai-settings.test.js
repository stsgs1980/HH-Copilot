/**
 * TESTS: AI settings UI panel module (F5.6)
 * Covers:
 *   - loadAiConfig: success (3 shapes), BG error, no chrome.runtime
 *   - saveAiConfig: success, BAD_INPUT, BG error
 *   - populateAiFields: populates 3 fields, defaults on BG error, no shadowRoot
 *   - readAiFields: reads 3 fields from DOM
 *   - bindAiSettingsHandlers: debounce, partial save on input
 *   - internal helpers: setFieldValue, getFieldValue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadAiConfig,
  saveAiConfig,
  populateAiFields,
  readAiFields,
  bindAiSettingsHandlers,
  _internal,
} from '../src/ui/panel/ai-settings.js';
import { refs } from '../src/ui/state.js';

// ===============================================
// chrome stub
// ===============================================

function installChromeStub() {
  globalThis.chrome = {
    runtime: {
      sendMessage: vi.fn(),
      lastError: null,
    },
  };
}

beforeEach(() => {
  installChromeStub();
  // Reset refs.shadowRoot before each test
  refs.shadowRoot = null;
});

// ===============================================
// loadAiConfig
// ===============================================

describe('F5.6 -- loadAiConfig', () => {
  it('handles {ok:true, config:{...}} shape (background wrapper)', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { baseUrl: 'https://x.example/v1', apiKey: 'k1', model: 'm1' } });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe('https://x.example/v1');
    expect(res.config.apiKey).toBe('k1');
    expect(res.config.model).toBe('m1');
  });

  it('handles direct config shape (no ok wrapper)', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ baseUrl: 'https://y.example/v1', apiKey: 'k2', model: 'm2' });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe('https://y.example/v1');
    expect(res.config.model).toBe('m2');
  });

  it('applies defaults when cfg fields missing', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: {} });
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(true);
    expect(res.config.baseUrl).toBe('https://internal-api.z.ai/v1');
    expect(res.config.apiKey).toBe('Z.ai'); // built-in marker default
    expect(res.config.token).toBe(''); // empty (user must paste their JWT)
    expect(res.config.model).toBe('glm-4.5');
  });

  it('returns EMPTY_RESP when BG returns null', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('EMPTY_RESP');
  });

  it('returns NO_BG when chrome.runtime missing', async () => {
    const saved = globalThis.chrome.runtime;
    delete globalThis.chrome.runtime;
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NO_BG');
    globalThis.chrome.runtime = saved;
  });

  it('returns BG_ERR when lastError set', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      chrome.runtime.lastError = { message: 'port closed' };
      cb(undefined);
      chrome.runtime.lastError = null;
    });
    const res = await loadAiConfig();
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BG_ERR');
  });
});

// ===============================================
// saveAiConfig
// ===============================================

describe('F5.6 -- saveAiConfig', () => {
  it('sends ai-set-config with partial config on success', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { ...msg.config } });
    });
    const res = await saveAiConfig({ apiKey: 'new-key' });
    expect(res.ok).toBe(true);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ai-set-config', config: { apiKey: 'new-key' } }),
      expect.any(Function)
    );
  });

  it('returns BAD_INPUT on non-object partial', async () => {
    const res = await saveAiConfig(null);
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BAD_INPUT');
  });

  it('returns EMPTY_RESP when BG returns null', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const res = await saveAiConfig({ model: 'glm-4.5' });
    expect(res.ok).toBe(false);
    expect(res.code).toBe('EMPTY_RESP');
  });
});

// ===============================================
// populateAiFields (uses refs.shadowRoot)
// ===============================================

function makeShadowRootWithFields(values) {
  const div = document.createElement('div');
  div.innerHTML = `
    <input id="s-ai-base-url" value="">
    <input id="s-ai-api-key" value="">
    <textarea id="s-ai-token"></textarea>
    <input id="s-ai-chat-id" value="">
    <input id="s-ai-user-id" value="">
    <input id="s-ai-model" value="">
    <input id="s-ai-timeout" value="">
  `;
  const sr = {
    getElementById(id) {
      const el = div.querySelector('#' + id);
      if (el && values && values[id] !== undefined) el.value = values[id];
      return el;
    },
  };
  return sr;
}

describe('F5.6 -- populateAiFields', () => {
  it('populates the 4 fields from loaded config', async () => {
    refs.shadowRoot = makeShadowRootWithFields();
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, config: { baseUrl: 'https://b/v1', apiKey: 'kk', model: 'mm', timeoutMs: 75000 } });
    });
    const ok = await populateAiFields();
    expect(ok).toBe(true);
    expect(refs.shadowRoot.getElementById('s-ai-base-url').value).toBe('https://b/v1');
    expect(refs.shadowRoot.getElementById('s-ai-api-key').value).toBe('kk');
    expect(refs.shadowRoot.getElementById('s-ai-model').value).toBe('mm');
    expect(refs.shadowRoot.getElementById('s-ai-timeout').value).toBe('75000');
  });

  it('falls back to defaults on BG error', async () => {
    refs.shadowRoot = makeShadowRootWithFields();
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb(null);
    });
    const ok = await populateAiFields();
    expect(ok).toBe(false);
    expect(refs.shadowRoot.getElementById('s-ai-base-url').value).toBe('https://internal-api.z.ai/v1');
    expect(refs.shadowRoot.getElementById('s-ai-api-key').value).toBe('Z.ai');
    expect(refs.shadowRoot.getElementById('s-ai-token').value).toBe('');
    expect(refs.shadowRoot.getElementById('s-ai-chat-id').value).toBe('');
    expect(refs.shadowRoot.getElementById('s-ai-user-id').value).toBe('');
    expect(refs.shadowRoot.getElementById('s-ai-model').value).toBe('glm-4.5');
    expect(refs.shadowRoot.getElementById('s-ai-timeout').value).toBe('60000');
  });

  it('returns false when no shadowRoot', async () => {
    refs.shadowRoot = null;
    const ok = await populateAiFields();
    expect(ok).toBe(false);
  });
});

// ===============================================
// readAiFields
// ===============================================

describe('F5.6 -- readAiFields', () => {
  it('reads 4 field values from DOM', () => {
    refs.shadowRoot = makeShadowRootWithFields({
      's-ai-base-url': 'https://r/v1',
      's-ai-api-key': 'rk',
      's-ai-model': 'rm',
      's-ai-timeout': '120000',
    });
    const cfg = readAiFields();
    expect(cfg.baseUrl).toBe('https://r/v1');
    expect(cfg.apiKey).toBe('rk');
    expect(cfg.model).toBe('rm');
    expect(cfg.timeoutMs).toBe(120000);
  });

  it('falls back to 60000 when timeout field is empty or invalid', () => {
    refs.shadowRoot = makeShadowRootWithFields({
      's-ai-base-url': 'https://r/v1',
      's-ai-api-key': 'rk',
      's-ai-model': 'rm',
      's-ai-timeout': 'abc',
    });
    const cfg = readAiFields();
    expect(cfg.timeoutMs).toBe(60000);
  });

  it('returns empty strings (and 60000 timeout) when no shadowRoot', () => {
    refs.shadowRoot = null;
    const cfg = readAiFields();
    expect(cfg.baseUrl).toBe('');
    expect(cfg.apiKey).toBe('');
    expect(cfg.model).toBe('');
    expect(cfg.timeoutMs).toBe(60000);
  });
});

// ===============================================
// bindAiSettingsHandlers (debounce)
// ===============================================

describe('F5.6 -- bindAiSettingsHandlers', () => {
  it('binds input handlers to 4 AI fields', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = makeShadowRootWithFields();
    bindAiSettingsHandlers(container, { debounceMs: 10 });
    // No assertion needed -- if it runs without throwing, binding succeeded
    expect(true).toBe(true);
  });

  it('saves partial config after debounce when input changes', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = {
      getElementById(id) {
        return container.querySelector('#' + id);
      },
    };
    let savedPartial = null;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      if (msg.type === 'ai-set-config') {
        savedPartial = msg.config;
        cb({ ok: true });
      } else {
        cb({ ok: true, config: {} });
      }
    });

    bindAiSettingsHandlers(container, { debounceMs: 10 });
    const input = container.querySelector('#s-ai-api-key');
    input.value = 'new-key';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait past debounce
    await new Promise(r => setTimeout(r, 30));

    expect(savedPartial).toEqual({ apiKey: 'new-key' });
  });

  it('saves timeoutMs partial when timeout field changes', async () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input id="s-ai-base-url" value="https://a/v1">
      <input id="s-ai-api-key" value="k">
      <input id="s-ai-model" value="m">
      <input id="s-ai-timeout" value="60000">
    `;
    refs.shadowRoot = {
      getElementById(id) {
        return container.querySelector('#' + id);
      },
    };
    let savedPartial = null;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      if (msg.type === 'ai-set-config') {
        savedPartial = msg.config;
        cb({ ok: true });
      } else {
        cb({ ok: true, config: {} });
      }
    });

    bindAiSettingsHandlers(container, { debounceMs: 10 });
    const input = container.querySelector('#s-ai-timeout');
    input.value = '120000';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(r => setTimeout(r, 30));

    expect(savedPartial).toEqual({ timeoutMs: 120000 });
  });

  it('no-op when container is null', () => {
    bindAiSettingsHandlers(null);
    expect(true).toBe(true);
  });
});

// ===============================================
// Internal helpers
// ===============================================

describe('F5.6 -- internal helpers', () => {
  it('setFieldValue sets value when element exists', () => {
    const div = document.createElement('div');
    const inp = document.createElement('input');
    inp.id = 'x';
    div.appendChild(inp);
    const sr = { getElementById: (id) => div.querySelector('#' + id) };
    _internal.setFieldValue(sr, 'x', 'val1');
    expect(inp.value).toBe('val1');
  });

  it('setFieldValue is no-op when element missing', () => {
    const sr = { getElementById: () => null };
    _internal.setFieldValue(sr, 'nope', 'val');
    expect(true).toBe(true);
  });

  it('getFieldValue returns value when element exists', () => {
    const div = document.createElement('div');
    const inp = document.createElement('input');
    inp.id = 'y';
    inp.value = 'val2';
    div.appendChild(inp);
    const sr = { getElementById: (id) => div.querySelector('#' + id) };
    expect(_internal.getFieldValue(sr, 'y')).toBe('val2');
  });

  it('getFieldValue returns empty string when element missing', () => {
    const sr = { getElementById: () => null };
    expect(_internal.getFieldValue(sr, 'nope')).toBe('');
  });

  it('AI_FIELD_IDS has exactly 7 ids (baseUrl, apiKey, token, chatId, userId, model, timeout)', () => {
    expect(_internal.AI_FIELD_IDS).toHaveLength(7);
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-base-url');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-api-key');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-token');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-chat-id');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-user-id');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-model');
    expect(_internal.AI_FIELD_IDS).toContain('s-ai-timeout');
  });
});
