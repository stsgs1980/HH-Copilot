/**
 * TESTS: parse-experience.js
 * Pure functions — no DOM needed
 */

import { describe, it, expect } from 'vitest';
import { parseExperienceString } from '../src/lib/parse-experience.js';

describe('parseExperienceString', () => {
  it('parses "Нет опыта"', () => {
    const r = parseExperienceString('Нет опыта');
    expect(r.min).toBe(0);
    expect(r.max).toBe(0);
  });

  it('parses "Не требуется"', () => {
    const r = parseExperienceString('Не требуется');
    expect(r.min).toBe(0);
    expect(r.max).toBe(0);
  });

  it('parses "Более 6 лет"', () => {
    const r = parseExperienceString('Более 6 лет');
    expect(r.min).toBe(6);
    expect(r.max).toBeNull();
  });

  it('parses "От 1 года"', () => {
    const r = parseExperienceString('От 1 года');
    expect(r.min).toBe(1);
    expect(r.max).toBeNull();
  });

  it('parses "1-3 года" (range with dash)', () => {
    const r = parseExperienceString('1-3 года');
    expect(r.min).toBe(1);
    expect(r.max).toBe(3);
  });

  it('parses "1–3 года" (range with en-dash)', () => {
    const r = parseExperienceString('1–3 года');
    expect(r.min).toBe(1);
    expect(r.max).toBe(3);
  });

  it('parses "3—6 лет" (range with em-dash)', () => {
    const r = parseExperienceString('3—6 лет');
    expect(r.min).toBe(3);
    expect(r.max).toBe(6);
  });

  it('parses "5 лет" (exact)', () => {
    const r = parseExperienceString('5 лет');
    expect(r.min).toBe(5);
    expect(r.max).toBeNull();
  });

  it('parses "6 месяцев"', () => {
    const r = parseExperienceString('6 месяцев');
    expect(r.min).toBe(0.5);
    expect(r.max).toBe(0.5);
  });

  it('handles empty string', () => {
    const r = parseExperienceString('');
    expect(r.raw).toBe('');
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
  });

  it('handles null/undefined', () => {
    const r = parseExperienceString(null);
    expect(r.raw).toBe('');
    expect(r.min).toBeNull();
  });

  it('handles unrecognized text', () => {
    const r = parseExperienceString('something weird');
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.raw).toBe('something weird');
  });

  it('preserves raw input', () => {
    const r = parseExperienceString('Более 6 лет');
    expect(r.raw).toBe('Более 6 лет');
  });
});
