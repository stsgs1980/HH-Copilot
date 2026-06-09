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
  return Math.max(2.0, z * stddev + mean);
}

export function randomDelay() {
  return new Promise(r => setTimeout(r, gaussianRandom() * 1000));
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
