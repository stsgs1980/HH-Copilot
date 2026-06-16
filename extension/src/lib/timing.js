/**
 * LIB: TIMING
 * =============
 * Random delays, reading simulation, and typing simulation
 * to mimic human-like interaction patterns.
 */

export function gaussianRandom(mean, stddev) {
  mean = mean || 10.0; stddev = stddev || 4.0;
  const u1 = Math.max(1e-10, Math.min(1 - 1e-10, Math.random()));
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * Math.random());
  return z * stddev + mean;
}

export function randomDelay() {
  // Floor of 2.0s (2000ms) for default reading/simulation delays
  return new Promise(r => setTimeout(r, Math.max(2000, gaussianRandom() * 1000)));
}

export function gaussianDelay(minMs, maxMs) {
  minMs = minMs || 2000;
  maxMs = maxMs || 5000;
  const mean = (minMs + maxMs) / 2;
  const stddev = (maxMs - minMs) / 4;
  // Clamp to [minMs, maxMs] range
  const delay = Math.max(minMs, Math.min(maxMs, gaussianRandom(mean / 1000, stddev / 1000) * 1000));
  return new Promise(r => setTimeout(r, delay));
}

export function simulateReading() {
  const delay = 5000 + Math.random() * 7000;
  return new Promise(r => setTimeout(r, delay));
}

/**
 * Simulate human-like char-by-char typing into an input/textarea element.
 *
 * F3.3 acceptance criteria:
 *   - Each char appears with delay
 *   - Pauses on punctuation (longer delay after . , ! ? ; : —)
 *   - Input events fire (bubbles: true)
 *   - textarea.value contains full text after completion
 *
 * Anti-hallucination checks:
 *   - Uses native setter from HTMLTextAreaElement.prototype.value
 *     (React/Magritte frameworks only detect changes via the native setter,
 *      not direct el.value = assignment)
 *   - readonly doesn't crash (checks hasAttribute('readonly') and skips gracefully)
 *   - All events bubbles: true
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} el -- target input/textarea
 * @param {string} text -- text to type
 * @param {Object} [opts] -- { baseDelay (ms, default 30), jitter (ms, default 90), punctDelay (ms, default 300) }
 * @returns {Promise<boolean>} true if typing completed, false if aborted (readonly/unsupported)
 */
export async function simulateTyping(el, text, opts) {
  if (!el || typeof text !== 'string') return false;

  // Anti-hallucination: skip readonly elements gracefully (don't crash)
  if (el.hasAttribute && el.hasAttribute('readonly')) {
    return false;
  }

  const baseDelay = (opts && opts.baseDelay) || 30;
  const jitter = (opts && opts.jitter) || 90;
  const punctDelay = (opts && opts.punctDelay) || 300;

  // Anti-hallucination: use native setter so React/Magritte detects the change.
  // Direct `el.value = x` bypasses the prototype setter and React's onChange
  // handler never fires. We MUST use the descriptor's set method.
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : (el instanceof HTMLInputElement ? HTMLInputElement.prototype : null);

  const nativeSetter = proto
    ? Object.getOwnPropertyDescriptor(proto, 'value')?.set
    : null;

  // Characters that trigger a longer pause (sentence/clause boundaries)
  // Note: em-dash (U+2014) and en-dash (U+2013) are included via escape sequences
  // to comply with AHG Rule 15 (no raw Unicode dashes in source code).
  const PUNCT = new Set(['.', ',', '!', '?', ';', ':', '\u2014', '\u2013']);

  for (const ch of text) {
    if (nativeSetter) {
      nativeSetter.call(el, (el.value || '') + ch);
    } else {
      // Fallback: direct assignment (won't trigger React, but at least sets the value)
      el.value = (el.value || '') + ch;
    }

    // Dispatch input event so frameworks pick up the change
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Longer pause after punctuation; normal random delay otherwise
    const delay = PUNCT.has(ch)
      ? punctDelay + Math.random() * 100
      : baseDelay + Math.random() * jitter;
    await new Promise(r => setTimeout(r, delay));
  }

  // Final change event to signal completion
  el.dispatchEvent(new Event('change', { bubbles: true }));

  return true;
}
