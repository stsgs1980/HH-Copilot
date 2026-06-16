/**
 * Tests for timing.js — simulateTyping (F3.3)
 *
 * F3.3 acceptance criteria:
 *   - Each char appears with delay
 *   - Pauses on punctuation (longer delay after . , ! ? ; : —)
 *   - Input events fire (bubbles: true)
 *   - textarea.value contains full text after completion
 *
 * Anti-hallucination checks:
 *   - Uses native setter from HTMLTextAreaElement.prototype.value
 *   - readonly doesn't crash (returns false)
 *   - All events bubbles: true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simulateTyping } from '../src/lib/timing.js';

// Speed up tests: mock setTimeout to resolve immediately
vi.mock('global', () => ({
  setTimeout: (cb) => cb(),
}));

// Patch setTimeout to be instant
const originalSetTimeout = global.setTimeout;
beforeEach(() => {
  global.setTimeout = (cb) => cb();
});
afterEach(() => {
  global.setTimeout = originalSetTimeout;
});

import { afterEach } from 'vitest';

describe('simulateTyping (F3.3)', () => {
  let textarea;

  beforeEach(() => {
    textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
  });

  afterEach(() => {
    textarea.remove();
  });

  it('types text char-by-char into textarea', async () => {
    await simulateTyping(textarea, 'Hi');
    expect(textarea.value).toBe('Hi');
  });

  it('types full text with punctuation', async () => {
    await simulateTyping(textarea, 'Hello, world!');
    expect(textarea.value).toBe('Hello, world!');
  });

  it('dispatches input event for each char (bubbles: true)', async () => {
    const inputEvents = [];
    textarea.addEventListener('input', (e) => {
      inputEvents.push(e);
    });
    await simulateTyping(textarea, 'abc');
    // 3 chars = 3 input events
    expect(inputEvents.length).toBe(3);
    // All events should bubble
    inputEvents.forEach(e => expect(e.bubbles).toBe(true));
  });

  it('dispatches final change event after typing completes', async () => {
    const changeEvents = [];
    textarea.addEventListener('change', (e) => {
      changeEvents.push(e);
    });
    await simulateTyping(textarea, 'test');
    expect(changeEvents.length).toBe(1);
    expect(changeEvents[0].bubbles).toBe(true);
  });

  it('uses native setter (not direct el.value =)', async () => {
    // Replace the native setter on the prototype with a spy
    const proto = HTMLTextAreaElement.prototype;
    const original = Object.getOwnPropertyDescriptor(proto, 'value');
    const setterSpy = vi.fn(original.set);
    Object.defineProperty(proto, 'value', {
      ...original,
      set: setterSpy,
    });

    try {
      await simulateTyping(textarea, 'X');
      expect(setterSpy).toHaveBeenCalled();
      expect(textarea.value).toBe('X');
    } finally {
      // Restore original descriptor
      Object.defineProperty(proto, 'value', original);
    }
  });

  it('returns false for readonly textarea (does not crash)', async () => {
    textarea.setAttribute('readonly', '');
    const result = await simulateTyping(textarea, 'test');
    expect(result).toBe(false);
    // Value should NOT be modified
    expect(textarea.value).toBe('');
  });

  it('returns false for null/undefined element', async () => {
    expect(await simulateTyping(null, 'test')).toBe(false);
    expect(await simulateTyping(undefined, 'test')).toBe(false);
  });

  it('returns false for non-string text', async () => {
    expect(await simulateTyping(textarea, null)).toBe(false);
    expect(await simulateTyping(textarea, undefined)).toBe(false);
    expect(await simulateTyping(textarea, 123)).toBe(false);
  });

  it('handles empty string gracefully', async () => {
    const result = await simulateTyping(textarea, '');
    expect(result).toBe(true);
    expect(textarea.value).toBe('');
  });

  it('preserves existing content when typing more', async () => {
    textarea.value = 'existing ';
    await simulateTyping(textarea, 'more');
    expect(textarea.value).toBe('existing more');
  });

  it('pauses longer on punctuation (delay difference)', async () => {
    // Mock Math.random to return 0 for deterministic delays
    const origRandom = Math.random;
    Math.random = () => 0;

    const delays = [];
    const origSetTimeout = global.setTimeout;
    global.setTimeout = (cb, ms) => {
      delays.push(ms);
      cb();
    };

    // Type "a.b" — 'a' = base, '.' = punct, 'b' = base
    await simulateTyping(textarea, 'a.b', {
      baseDelay: 30,
      jitter: 90,
      punctDelay: 300,
    });

    Math.random = origRandom;
    global.setTimeout = origSetTimeout;

    // 3 chars = 3 delays
    expect(delays.length).toBe(3);
    // 'a' -> 30 + 0*90 = 30
    expect(delays[0]).toBe(30);
    // '.' -> 300 + 0*100 = 300 (punctuation pause)
    expect(delays[1]).toBe(300);
    // 'b' -> 30 + 0*90 = 30
    expect(delays[2]).toBe(30);
  });

  it('works with HTMLInputElement too', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    await simulateTyping(input, 'hello');
    expect(input.value).toBe('hello');

    input.remove();
  });

  it('accepts custom delay options', async () => {
    const delays = [];
    const origSetTimeout = global.setTimeout;
    global.setTimeout = (cb, ms) => {
      delays.push(ms);
      cb();
    };

    await simulateTyping(textarea, 'ab', {
      baseDelay: 100,
      jitter: 50,
    });

    global.setTimeout = origSetTimeout;

    // 2 chars + 1 change event (change has no delay)
    expect(delays.length).toBe(2);
    // 'a' -> 100 + random*50
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[0]).toBeLessThanOrEqual(150);
  });
});
