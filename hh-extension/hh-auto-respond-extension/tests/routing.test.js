/**
 * TESTS: routing logic
 * Tests routeToHandler path matching — extracted logic without side effects
 */

import { describe, it, expect } from 'vitest';

/**
 * Extract the routing logic from main-page-handlers.js for pure testing.
 * We test the path matching, not the handler execution.
 */
function matchRoute(path) {
  if (path.startsWith('/search/vacancy')) return 'vacancySearch';
  if (/^\/resume\/[a-f0-9]+/.test(path)) return 'resumeDetail';
  if (path.startsWith('/applicant/resumes')) return 'resumeList';
  if (/^\/vacancy\/\d+/.test(path)) return 'vacancyDetail';
  if (path === '/' || path === '') return 'mainPage';
  return null;
}

describe('routeToHandler — path matching', () => {
  it('routes /search/vacancy to vacancySearch', () => {
    expect(matchRoute('/search/vacancy')).toBe('vacancySearch');
    expect(matchRoute('/search/vacancy?text=python')).toBe('vacancySearch');
    expect(matchRoute('/search/vacancy?area=1&text=java')).toBe('vacancySearch');
  });

  it('routes /vacancy/{id} to vacancyDetail', () => {
    expect(matchRoute('/vacancy/12345678')).toBe('vacancyDetail');
    expect(matchRoute('/vacancy/999999999?from=main')).toBe('vacancyDetail');
  });

  it('routes /resume/{hash} to resumeDetail', () => {
    expect(matchRoute('/resume/abcdef123456')).toBe('resumeDetail');
    expect(matchRoute('/resume/a1b2c3d4e5f6')).toBe('resumeDetail');
  });

  it('routes /resume/edit/{hash} to resumeDetail (edit page)', () => {
    expect(matchRoute('/resume/edit/abcdef123456')).toBe('resumeDetail');
  });

  it('routes /applicant/resumes to resumeList', () => {
    expect(matchRoute('/applicant/resumes')).toBe('resumeList');
  });

  it('routes / (main page) to mainPage', () => {
    expect(matchRoute('/')).toBe('mainPage');
  });

  it('routes empty string to mainPage', () => {
    expect(matchRoute('')).toBe('mainPage');
  });

  it('returns null for unknown routes', () => {
    expect(matchRoute('/employer/vacancies')).toBeNull();
    expect(matchRoute('/settings')).toBeNull();
    expect(matchRoute('/articles/some-article')).toBeNull();
  });

  it('does NOT match /vacancy/create as vacancyDetail (no digits)', () => {
    // /vacancy/create should NOT match /^\/vacancy\/\d+/
    expect(matchRoute('/vacancy/create')).toBeNull();
  });

  it('does NOT match /vacancies (plural) as vacancyDetail', () => {
    expect(matchRoute('/vacancies')).toBeNull();
  });
});
