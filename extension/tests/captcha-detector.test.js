/**
 * TESTS: CAPTCHA detector (F4.4)
 * Covers:
 *   - detectCaptcha: each selector type, hidden element skip, no CAPTCHA, null root
 *   - getCaptchaState / isAutoPaused: initial state
 *   - pauseForCaptcha: state set + persisted
 *   - resumeFromCaptcha: state cleared + storage removed
 *   - loadCaptchaState: persisted state loaded
 *   - checkAndPause: respects captchaAutoPause flag, idempotent on already-paused
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectCaptcha,
  getCaptchaState,
  isAutoPaused,
  pauseForCaptcha,
  resumeFromCaptcha,
  loadCaptchaState,
  checkAndPause,
  CAPTCHA_STATE_KEY,
  _internal,
} from '../src/lib/captcha-detector.js';

// ===============================================
// chrome.storage.local stub
// ===============================================

let store;

beforeEach(() => {
  store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(obj) { Object.assign(store, obj); },
        async remove(key) { delete store[key]; },
      },
    },
  };
  _internal._resetState();
});

// ===============================================
// detectCaptcha
// ===============================================

describe('F4.4 -- detectCaptcha', () => {
  it('detects img[src*=captcha]', () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = 'https://hh.ru/captcha/abc.png';
    root.appendChild(img);
    const res = detectCaptcha(root);
    expect(res.found).toBe(true);
    expect(res.type).toBe('image');
  });

  it('detects .g-recaptcha', () => {
    const root = document.createElement('div');
    const div = document.createElement('div');
    div.className = 'g-recaptcha';
    root.appendChild(div);
    expect(detectCaptcha(root).type).toBe('recaptcha');
  });

  it('detects [data-qa*=captcha]', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('data-qa', 'captcha-input');
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe('data-qa');
  });

  it('detects iframe[src*=recaptcha]', () => {
    const root = document.createElement('div');
    const ifr = document.createElement('iframe');
    ifr.src = 'https://www.google.com/recaptcha/api2';
    root.appendChild(ifr);
    expect(detectCaptcha(root).type).toBe('recaptcha-iframe');
  });

  it('detects #captcha id', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    el.id = 'captcha';
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe('captcha-id');
  });

  it('detects .captcha class', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    el.className = 'captcha';
    root.appendChild(el);
    expect(detectCaptcha(root).type).toBe('captcha-class');
  });

  it('detects textarea#g-recaptcha-response', () => {
    const root = document.createElement('div');
    const ta = document.createElement('textarea');
    ta.id = 'g-recaptcha-response';
    root.appendChild(ta);
    expect(detectCaptcha(root).type).toBe('recaptcha-response');
  });

  it('returns found:false when no CAPTCHA present', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div>some content</div><p>hello</p>';
    const res = detectCaptcha(root);
    expect(res.found).toBe(false);
    expect(res.type).toBeNull();
  });

  it('returns found:false for null/undefined root', () => {
    expect(detectCaptcha(null).found).toBe(false);
    expect(detectCaptcha(undefined).found).toBe(false);
  });

  it('skips hidden elements (display:none)', () => {
    const root = document.createElement('div');
    const el = document.createElement('div');
    el.className = 'g-recaptcha';
    el.style.display = 'none';
    root.appendChild(el);
    // offsetParent is null for display:none elements in jsdom
    // The skip check should prevent false positive
    const res = detectCaptcha(root);
    expect(res.found).toBe(false);
  });

  it('returns first match when multiple CAPTCHAs present (no crash)', () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = '/captcha/x.png';
    const div = document.createElement('div');
    div.className = 'g-recaptcha';
    root.appendChild(img);
    root.appendChild(div);
    const res = detectCaptcha(root);
    expect(res.found).toBe(true);
    expect(res.type).toBe('image'); // first in CAPTCHA_SELECTORS order
  });
});

// ===============================================
// getCaptchaState / isAutoPaused
// ===============================================

describe('F4.4 -- getCaptchaState / isAutoPaused', () => {
  it('returns initial empty state', () => {
    const s = getCaptchaState();
    expect(s.paused).toBe(false);
    expect(s.reason).toBeNull();
    expect(s.detectedAt).toBeNull();
    expect(s.type).toBeNull();
  });

  it('isAutoPaused returns false initially', () => {
    expect(isAutoPaused()).toBe(false);
  });

  it('isAutoPaused returns true after pauseForCaptcha', async () => {
    await pauseForCaptcha('image', 'test');
    expect(isAutoPaused()).toBe(true);
  });

  it('isAutoPaused returns false after resumeFromCaptcha', async () => {
    await pauseForCaptcha('image');
    await resumeFromCaptcha();
    expect(isAutoPaused()).toBe(false);
  });
});

// ===============================================
// pauseForCaptcha
// ===============================================

describe('F4.4 -- pauseForCaptcha', () => {
  it('sets paused state with type + reason', async () => {
    await pauseForCaptcha('recaptcha', 'Test reason');
    const s = getCaptchaState();
    expect(s.paused).toBe(true);
    expect(s.type).toBe('recaptcha');
    expect(s.reason).toBe('Test reason');
    expect(s.detectedAt).toBeTruthy();
  });

  it('uses default reason when none provided', async () => {
    await pauseForCaptcha('image');
    expect(getCaptchaState().reason).toContain('image');
  });

  it('persists state to chrome.storage.local', async () => {
    await pauseForCaptcha('image');
    expect(store[CAPTCHA_STATE_KEY]).toBeDefined();
    expect(store[CAPTCHA_STATE_KEY].paused).toBe(true);
  });

  it('returns true on success', async () => {
    const ok = await pauseForCaptcha('image');
    expect(ok).toBe(true);
  });
});

// ===============================================
// resumeFromCaptcha
// ===============================================

describe('F4.4 -- resumeFromCaptcha', () => {
  it('clears paused state', async () => {
    await pauseForCaptcha('image');
    await resumeFromCaptcha();
    const s = getCaptchaState();
    expect(s.paused).toBe(false);
    expect(s.reason).toBeNull();
    expect(s.type).toBeNull();
  });

  it('removes state from storage', async () => {
    await pauseForCaptcha('image');
    expect(store[CAPTCHA_STATE_KEY]).toBeDefined();
    await resumeFromCaptcha();
    expect(store[CAPTCHA_STATE_KEY]).toBeUndefined();
  });

  it('returns true on success', async () => {
    await pauseForCaptcha('image');
    const ok = await resumeFromCaptcha();
    expect(ok).toBe(true);
  });
});

// ===============================================
// loadCaptchaState
// ===============================================

describe('F4.4 -- loadCaptchaState', () => {
  it('loads persisted state into memory', async () => {
    store[CAPTCHA_STATE_KEY] = {
      paused: true,
      reason: 'persisted',
      detectedAt: '2026-06-17T10:00:00Z',
      type: 'image',
    };
    await loadCaptchaState();
    const s = getCaptchaState();
    expect(s.paused).toBe(true);
    expect(s.reason).toBe('persisted');
    expect(s.type).toBe('image');
  });

  it('keeps default state when nothing persisted', async () => {
    await loadCaptchaState();
    expect(getCaptchaState().paused).toBe(false);
  });
});

// ===============================================
// checkAndPause
// ===============================================

describe('F4.4 -- checkAndPause', () => {
  it('pauses when CAPTCHA found and auto-pause enabled', async () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = '/captcha/x.png';
    root.appendChild(img);
    const res = await checkAndPause(root, { captchaAutoPause: true });
    expect(res.found).toBe(true);
    expect(res.paused).toBe(true);
    expect(isAutoPaused()).toBe(true);
  });

  it('does NOT pause when captchaAutoPause disabled', async () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = '/captcha/x.png';
    root.appendChild(img);
    const res = await checkAndPause(root, { captchaAutoPause: false });
    expect(res.found).toBe(true);
    expect(res.paused).toBe(false);
    expect(isAutoPaused()).toBe(false);
  });

  it('returns found:false when no CAPTCHA present', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>no captcha</p>';
    const res = await checkAndPause(root, { captchaAutoPause: true });
    expect(res.found).toBe(false);
    expect(res.paused).toBe(false);
  });

  it('is idempotent when already paused', async () => {
    await pauseForCaptcha('image', 'first');
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = '/captcha/y.png';
    root.appendChild(img);
    await checkAndPause(root, { captchaAutoPause: true });
    // Reason should not be overwritten
    expect(getCaptchaState().reason).toBe('first');
  });

  it('defaults to pausing when settings missing', async () => {
    const root = document.createElement('div');
    const img = document.createElement('img');
    img.src = '/captcha/z.png';
    root.appendChild(img);
    const res = await checkAndPause(root); // no settings arg
    expect(res.found).toBe(true);
    expect(res.paused).toBe(true);
  });
});

// ===============================================
// Internal sanity
// ===============================================

describe('F4.4 -- internal', () => {
  it('CAPTCHA_SELECTORS has 7 entries', () => {
    expect(_internal.CAPTCHA_SELECTORS).toHaveLength(7);
  });

  it('each selector has sel + type', () => {
    for (const s of _internal.CAPTCHA_SELECTORS) {
      expect(s.sel).toBeTruthy();
      expect(s.type).toBeTruthy();
    }
  });

  it('CAPTCHA_STATE_KEY is a string', () => {
    expect(typeof _internal.CAPTCHA_STATE_KEY).toBe('string');
    expect(_internal.CAPTCHA_STATE_KEY.length).toBeGreaterThan(0);
  });
});
