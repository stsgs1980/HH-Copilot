/**
 * TESTS: formatRelativeTime (F4.1)
 * Pure function: hh.ru negotiations date string -> short relative label.
 * NEVER returns undefined. NEVER throws.
 */

import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../src/ui/tabs/negotiations-format.js';

describe('formatRelativeTime', () => {
  const now = new Date('2026-06-23T12:00:00');

  it('returns "" for undefined input', () => {
    expect(formatRelativeTime(undefined, now)).toBe('');
  });

  it('returns "" for null input', () => {
    expect(formatRelativeTime(null, now)).toBe('');
  });

  it('returns "" for empty string', () => {
    expect(formatRelativeTime('', now)).toBe('');
  });

  it('passes "вчера" through unchanged', () => {
    expect(formatRelativeTime('вчера', now)).toBe('вчера');
  });

  it('passes "сегодня" through unchanged', () => {
    expect(formatRelativeTime('сегодня', now)).toBe('сегодня');
  });

  it('passes already-relative "2ч назад" through unchanged', () => {
    expect(formatRelativeTime('2ч назад', now)).toBe('2ч назад');
  });

  it('passes already-relative "5 мин назад" through unchanged', () => {
    expect(formatRelativeTime('5 мин назад', now)).toBe('5 мин назад');
  });

  it('passes "только что" through unchanged', () => {
    expect(formatRelativeTime('только что', now)).toBe('только что');
  });

  it('returns "" for bare time without a calendar date', () => {
    expect(formatRelativeTime('14:30', now)).toBe('');
  });

  it('returns "" for unrecognized string', () => {
    expect(formatRelativeTime('lorem ipsum', now)).toBe('');
  });

  it('trims whitespace before deciding', () => {
    expect(formatRelativeTime('  вчера  ', now)).toBe('вчера');
  });

  it('never throws on a number input', () => {
    expect(() => formatRelativeTime(12345, now)).not.toThrow();
  });

  it('uses new Date() as default when now omitted', () => {
    expect(typeof formatRelativeTime('вчера')).toBe('string');
  });
});
