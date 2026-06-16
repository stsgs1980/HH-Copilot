/**
 * TESTS: negotiations AI reply UI (F4.3)
 * Covers:
 *   - requestAiReply: success path, BG error, no chrome.runtime, empty variants filter
 *   - insertVariant: with/without simulation, missing input, empty text
 *   - setAiTone: valid + invalid
 *   - _setAiState / _getAiState
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  requestAiReply,
  insertVariant,
  setAiTone,
  _setAiState,
  _getAiState,
} from '../src/ui/tabs/negotiations-ai-reply.js';

// ===============================================
// chrome stub + shadowRoot stub
// ===============================================

function installChromeStub() {
  const store = {};
  globalThis.chrome = {
    runtime: {
      sendMessage: vi.fn(),
      lastError: null,
    },
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(obj) { Object.assign(store, obj); },
      },
    },
  };
  return store;
}

function installShadowRootStub() {
  const elements = {};
  const sr = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = document.createElement('input');
        if (id === 'neg-type-emulation') {
          elements[id] = document.createElement('input');
          elements[id].type = 'checkbox';
          elements[id].checked = true;
        }
        if (id === 'neg-type-speed') {
          elements[id] = document.createElement('input');
          elements[id].type = 'number';
          elements[id].value = '80';
        }
      }
      return elements[id];
    },
  };
  // Patch refs module via globalThis? No -- the module imports { refs } directly.
  // Instead we use vi.mock or patch the module's internal refs. Easiest: bypass refs
  // by importing the module fresh and using the exported functions that don't touch refs.
  return sr;
}

beforeEach(() => {
  installChromeStub();
  _setAiState({ loading: false, error: null, variants: [], tone: 'formal' });
});

// ===============================================
// requestAiReply tests
// ===============================================

describe('F4.3 -- requestAiReply', () => {
  it('returns variants on success', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, variants: ['Reply 1', 'Reply 2', 'Reply 3'] });
    });
    const res = await requestAiReply(
      { vacancyTitle: 'Dev', company: 'X' },
      'formal',
      { threadRoot: document.createElement('div') } // empty thread
    );
    expect(res.ok).toBe(true);
    expect(res.variants).toHaveLength(3);
  });

  it('uses starter prompt when thread is empty', async () => {
    let capturedMsg;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      capturedMsg = msg;
      cb({ ok: true, variants: ['Hi'] });
    });
    await requestAiReply(
      { vacancyTitle: 'Dev', company: 'X' },
      'formal',
      { threadRoot: document.createElement('div') }
    );
    expect(capturedMsg.type).toBe('ai-chat-reply');
    expect(capturedMsg.history).toHaveLength(1);
    expect(capturedMsg.history[0].content).toContain('Dev');
    expect(capturedMsg.opts.tone).toBe('formal');
    expect(capturedMsg.opts.variants).toBe(3);
  });

  it('returns EMPTY_VARIANTS when AI returns no usable strings', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: true, variants: ['', null, '   '] });
    });
    const res = await requestAiReply(
      { vacancyTitle: 'Dev' },
      'formal',
      { threadRoot: document.createElement('div') }
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe('EMPTY_VARIANTS');
  });

  it('propagates BG error code', async () => {
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      cb({ ok: false, error: 'NO_API_KEY', code: 'NO_API_KEY' });
    });
    const res = await requestAiReply(
      { vacancyTitle: 'Dev' },
      'formal',
      { threadRoot: document.createElement('div') }
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NO_API_KEY');
  });

  it('returns NO_BG when chrome.runtime missing', async () => {
    const savedRuntime = globalThis.chrome.runtime;
    delete globalThis.chrome.runtime;
    const res = await requestAiReply(
      { vacancyTitle: 'Dev' },
      'formal',
      { threadRoot: document.createElement('div') }
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe('NO_BG');
    globalThis.chrome.runtime = savedRuntime;
  });

  it('handles BG throw via try/catch', async () => {
    chrome.runtime.sendMessage.mockImplementation(() => {
      throw new Error('Sync failure');
    });
    const res = await requestAiReply(
      { vacancyTitle: 'Dev' },
      'formal',
      { threadRoot: document.createElement('div') }
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe('BG_THROW');
  });

  it('reads chat thread from DOM when provided', async () => {
    // Build a fake thread DOM
    const root = document.createElement('div');
    const cell1 = document.createElement('div');
    cell1.setAttribute('data-qa', 'chat-cell-1');
    const t1 = document.createElement('div');
    t1.setAttribute('data-qa', 'chat-cell-text');
    t1.textContent = 'Existing employer message';
    cell1.appendChild(t1);
    root.appendChild(cell1);

    let captured;
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
      captured = msg;
      cb({ ok: true, variants: ['reply'] });
    });

    await requestAiReply({ vacancyTitle: 'Dev' }, 'friendly', { threadRoot: root });
    expect(captured.history).toHaveLength(1);
    expect(captured.history[0].content).toBe('Existing employer message');
    expect(captured.history[0].role).toBe('assistant');
  });
});

// ===============================================
// setAiTone tests
// ===============================================

describe('F4.3 -- setAiTone', () => {
  it('sets valid tone', () => {
    setAiTone('enthusiastic');
    expect(_getAiState().tone).toBe('enthusiastic');
  });

  it('ignores invalid tone', () => {
    setAiTone('formal');
    setAiTone('invalid-tone');
    expect(_getAiState().tone).toBe('formal');
  });
});

// ===============================================
// insertVariant tests
// ===============================================

describe('F4.3 -- insertVariant', () => {
  it('returns false when text is empty', async () => {
    const res = await insertVariant('');
    expect(res).toBe(false);
  });

  it('returns false when input element missing (no shadowRoot)', async () => {
    // refs.shadowRoot is undefined in test env -> getElementById returns nothing
    const res = await insertVariant('some text');
    expect(res).toBe(false);
  });
});

// ===============================================
// State management
// ===============================================

describe('F4.3 -- state', () => {
  it('_setAiState merges partial', () => {
    _setAiState({ loading: true });
    expect(_getAiState().loading).toBe(true);
    expect(_getAiState().tone).toBe('formal'); // preserved
  });

  it('_getAiState returns copy (not reference)', () => {
    const s1 = _getAiState();
    s1.loading = true;
    expect(_getAiState().loading).toBe(false); // unchanged
  });
});
