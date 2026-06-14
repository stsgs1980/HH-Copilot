/**
 * LIB: TIMING
 * =============
 * Random delays, reading simulation, and typing simulation
 * to mimic human-like interaction patterns.
 */

export function gaussianRandom(mean, stddev) {
  mean = mean || 10.0; stddev = stddev || 4.0;
  let u1 = Math.max(1e-10, Math.min(1 - 1e-10, Math.random()));
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

export async function simulateTyping(el, text) {
  if (!el || typeof text !== 'string') return;
  for (const ch of text) {
    el.value = (el.value || '') + ch;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30 + Math.random() * 90));
  }
}
