/**
 * LIB: CAPTCHA DETECTOR (F4.4)
 * =========================================
 * Detects CAPTCHA challenges on hh.ru pages and triggers auto-pause.
 *
 * Public API:
 *   - detectCaptcha(root) -> { found, type, source }
 *   - getCaptchaState() -> { paused, reason, detectedAt, type }
 *   - pauseForCaptcha(type, reason) -> persists pause state to storage
 *   - resumeFromCaptcha() -> clears pause state
 *   - isAutoPaused() -> boolean (quick check)
 *
 * Detection signals:
 *   - img[src*=captcha]
 *   - .g-recaptcha (Google reCAPTCHA widget)
 *   - [data-qa*=captcha] (hh.ru-specific data attribute)
 *   - iframe[src*=recaptcha] (reCAPTCHA iframe)
 *   - #captcha / .captcha (generic ID/class)
 *   - textarea#g-recaptcha-response (reCAPTCHA response field)
 *
 * Anti-hallucination:
 *   - Multiple CAPTCHAs don't crash (returns first match, scans all)
 *   - False positives don't block work (paused state is opt-out via
 *     settings.captchaAutoPause)
 *   - Pause correctly removed via resumeFromCaptcha()
 *   - State persisted to chrome.storage.local so survives page reload
 *
 * v1.9.47.0
 */

import { createLogger } from './anti-hallucination.js';

const captchaLog = createLogger('Captcha');

/** Selectors that indicate a CAPTCHA challenge is present. */
const CAPTCHA_SELECTORS = [
  { sel: 'img[src*="captcha"]', type: 'image' },
  { sel: '.g-recaptcha', type: 'recaptcha' },
  { sel: '[data-qa*="captcha"]', type: 'data-qa' },
  { sel: 'iframe[src*="recaptcha"]', type: 'recaptcha-iframe' },
  { sel: '#captcha', type: 'captcha-id' },
  { sel: '.captcha', type: 'captcha-class' },
  { sel: 'textarea#g-recaptcha-response', type: 'recaptcha-response' },
];

/** Storage key for CAPTCHA pause state. */
export const CAPTCHA_STATE_KEY = 'captchaState';

/** In-memory cache of pause state (avoids async reads in hot paths). */
let _state = { paused: false, reason: null, detectedAt: null, type: null };

/**
 * Detect whether a CAPTCHA challenge is present in the DOM.
 * @param {Document|Element} root
 * @returns {{ found: boolean, type: string|null, source: string|null }}
 */
export function detectCaptcha(root) {
  root = root || (typeof document !== 'undefined' ? document : null);
  if (!root || !root.querySelectorAll) return { found: false, type: null, source: null };

  for (const { sel, type } of CAPTCHA_SELECTORS) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        // Anti-ghost: skip elements explicitly hidden via inline style or computed style.
        // Note: jsdom does not compute layout, so offsetParent / getClientRects are
        // always empty/zero. We rely on inline style + computed style only.
        const style = (typeof getComputedStyle === 'function')
          ? getComputedStyle(el)
          : el.style;
        const display = style.display;
        const visibility = style.visibility;
        if (display === 'none' || visibility === 'hidden') continue;
        return { found: true, type, source: sel };
      }
    } catch (_e) { /* invalid selector */ }
  }

  return { found: false, type: null, source: null };
}

/**
 * Get current CAPTCHA pause state (in-memory cache, no async).
 * @returns {{paused:boolean, reason:string|null, detectedAt:string|null, type:string|null}}
 */
export function getCaptchaState() {
  return { ..._state };
}

/**
 * Quick check: is the extension currently auto-paused due to CAPTCHA?
 * @returns {boolean}
 */
export function isAutoPaused() {
  return _state.paused === true;
}

/**
 * Pause the extension due to CAPTCHA detection.
 * Persists to chrome.storage.local for survival across reloads.
 * @param {string} type -- captcha type from detectCaptcha()
 * @param {string} [reason] -- human-readable reason
 * @returns {Promise<boolean>}
 */
export async function pauseForCaptcha(type, reason) {
  _state = {
    paused: true,
    reason: reason || ('CAPTCHA detected: ' + (type || 'unknown')),
    detectedAt: new Date().toISOString(),
    type: type || null,
  };
  try {
    await chrome.storage.local.set({ [CAPTCHA_STATE_KEY]: _state });
    captchaLog.warn('AUTO-PAUSE: ' + _state.reason);
    return true;
  } catch (_e) {
    // State still set in memory, just not persisted
    return false;
  }
}

/**
 * Manually resume from CAPTCHA pause.
 * Clears both in-memory and persisted state.
 * @returns {Promise<boolean>}
 */
export async function resumeFromCaptcha() {
  _state = { paused: false, reason: null, detectedAt: null, type: null };
  try {
    await chrome.storage.local.remove(CAPTCHA_STATE_KEY);
    captchaLog.info('Manual resume: CAPTCHA pause cleared');
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Load persisted CAPTCHA state on startup.
 * Call once from main.js boot sequence.
 * @returns {Promise<void>}
 */
export async function loadCaptchaState() {
  try {
    const data = await chrome.storage.local.get(CAPTCHA_STATE_KEY);
    if (data && data[CAPTCHA_STATE_KEY]) {
      _state = { ..._state, ...data[CAPTCHA_STATE_KEY] };
    }
  } catch (_e) { /* ignore */ }
}

/**
 * Check page for CAPTCHA and auto-pause if found.
 * Respects settings.captchaAutoPause flag (when false, just logs).
 *
 * @param {Document|Element} [root]
 * @param {Object} [settings] -- { captchaAutoPause: boolean }
 * @returns {Promise<{found:boolean, paused:boolean, type:string|null}>}
 */
export async function checkAndPause(root, settings) {
  const detection = detectCaptcha(root);
  if (!detection.found) {
    return { found: false, paused: false, type: null };
  }

  const shouldPause = settings ? settings.captchaAutoPause !== false : true;
  if (shouldPause && !isAutoPaused()) {
    await pauseForCaptcha(detection.type, 'CAPTCHA detected: ' + detection.type);
  } else {
    captchaLog.info('CAPTCHA detected but auto-pause disabled or already paused');
  }

  return { found: true, paused: shouldPause, type: detection.type };
}

/** Exported for tests. */
export const _internal = {
  CAPTCHA_SELECTORS,
  CAPTCHA_STATE_KEY,
  _resetState: () => { _state = { paused: false, reason: null, detectedAt: null, type: null }; },
};
