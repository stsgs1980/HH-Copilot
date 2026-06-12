/**
 * TESTS: anti-hallucination.js
 * Pure functions — no DOM needed
 */

import { describe, it, expect } from 'vitest';
import { extractVacancyId, validateVacancyData } from '../src/lib/anti-hallucination.js';

// ═══════════════════════════════════════════════
// extractVacancyId
// ═══════════════════════════════════════════════

describe('extractVacancyId', () => {
  it('extracts ID from full hh.ru URL', () => {
    expect(extractVacancyId('https://hh.ru/vacancy/12345678')).toBe('12345678');
  });

  it('extracts ID from relative URL', () => {
    expect(extractVacancyId('/vacancy/99887766?from=main')).toBe('99887766');
  });

  it('extracts ID from URL with query params', () => {
    expect(extractVacancyId('https://hh.ru/vacancy/111222333?query=python')).toBe('111222333');
  });

  it('extracts ID from URL with hash', () => {
    expect(extractVacancyId('https://hh.ru/vacancy/555666777#section')).toBe('555666777');
  });

  it('returns empty string for non-vacancy URL', () => {
    expect(extractVacancyId('https://hh.ru/resume/abcdef')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractVacancyId(null)).toBe('');
    expect(extractVacancyId(undefined)).toBe('');
    expect(extractVacancyId('')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(extractVacancyId(12345)).toBe('');
    expect(extractVacancyId({})).toBe('');
  });

  it('handles long numeric IDs', () => {
    expect(extractVacancyId('/vacancy/1234567890123')).toBe('1234567890123');
  });

  // VotD tracking URLs — vacancyId in query params
  it('extracts ID from VotD content.hh.ru click URL', () => {
    expect(extractVacancyId('https://content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=132537734&contentId=21001')).toBe('132537734');
  });

  it('extracts ID from VotD adsrv.hh.ru click URL', () => {
    expect(extractVacancyId('https://adsrv.hh.ru/click?b=2090206&domainAreaId=1&vacancyId=111222333&from=main')).toBe('111222333');
  });

  it('extracts ID from VotD URL with vacancyId in middle of params', () => {
    expect(extractVacancyId('https://content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=99887766&contentPlaceId=0&domainAreaId=1')).toBe('99887766');
  });

  it('prefers /vacancy/NNN match over vacancyId param', () => {
    // Standard /vacancy/ path should be preferred (matched first)
    expect(extractVacancyId('https://hh.ru/vacancy/12345678?vacancyId=99999999')).toBe('12345678');
  });

  it('returns empty for URL without vacancyId param or /vacancy/ path', () => {
    expect(extractVacancyId('https://content.hh.ru/api/v1/something?contentId=123')).toBe('');
  });
});

// ═══════════════════════════════════════════════
// validateVacancyData
// ═══════════════════════════════════════════════

describe('validateVacancyData', () => {
  const validVacancy = () => ({
    title: 'Руководитель отдела продаж',
    company: 'ООО Тест',
    url: 'https://hh.ru/vacancy/12345678',
    id: '12345678',
  });

  it('validates a correct vacancy', () => {
    const result = validateVacancyData(validVacancy());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects null input', () => {
    const result = validateVacancyData(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('not an object');
  });

  it('rejects missing title', () => {
    const v = validVacancy();
    v.title = '';
    expect(validateVacancyData(v).valid).toBe(false);
  });

  it('rejects title shorter than 3 chars', () => {
    const v = validVacancy();
    v.title = 'AB';
    expect(validateVacancyData(v).valid).toBe(false);
  });

  it('rejects missing company', () => {
    const v = validVacancy();
    v.company = '';
    expect(validateVacancyData(v).valid).toBe(false);
  });

  it('rejects URL not starting with https://hh.ru/', () => {
    const v = validVacancy();
    v.url = 'http://evil.com/vacancy/123';
    expect(validateVacancyData(v).valid).toBe(false);
  });

  it('rejects missing id', () => {
    const v = validVacancy();
    v.id = '';
    expect(validateVacancyData(v).valid).toBe(false);
  });

  it('collects multiple errors', () => {
    const result = validateVacancyData({ title: '', company: '', url: '', id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
