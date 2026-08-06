/**
 * TESTS: SELECTOR VALIDATION
 * Tests for the selector debugging utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { testSelector, validateAllSelectors, logSelectorValidation, HH_SELECTORS } from '../src/lib/selectors.js';

describe('Selector Validation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('testSelector', () => {
    it('returns matched=true when selector finds elements', () => {
      document.body.innerHTML = '<div data-qa="vacancy-serp__vacancy"><a data-qa="serp-item__title">Test</a></div>';
      const result = testSelector('vacancyCard');
      expect(result.matched).toBe(true);
      expect(result.count).toBe(1);
      expect(result.selector).toBe('[data-qa~="vacancy-serp__vacancy"]');
    });

    it('returns matched=false when no selector matches', () => {
      document.body.innerHTML = '<div class="other">Test</div>';
      const result = testSelector('vacancyCard');
      expect(result.matched).toBe(false);
      expect(result.count).toBe(0);
      expect(result.selector).toBeNull();
    });

    it('tries fallback selectors in order', () => {
      // First selector doesn't match, second does
      document.body.innerHTML = '<div class="vacancy-serp-item"><a href="/vacancy/123">Test</a></div>';
      const result = testSelector('vacancyCard');
      expect(result.matched).toBe(true);
      expect(result.selector).toBe('[class*="vacancy-serp-item"]');
    });

    it('works with custom root element', () => {
      const root = document.createElement('div');
      root.innerHTML = '<div data-qa="vacancy-serp__vacancy">Test</div>';
      const result = testSelector('vacancyCard', root);
      expect(result.matched).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe('validateAllSelectors', () => {
    it('returns working and failing arrays', () => {
      document.body.innerHTML = '<div data-qa="vacancy-serp__vacancy"><a data-qa="serp-item__title">Test</a></div>';
      const result = validateAllSelectors();
      expect(Array.isArray(result.working)).toBe(true);
      expect(Array.isArray(result.failing)).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.working.length + result.failing.length).toBe(Object.keys(HH_SELECTORS).length);
    });

    it('includes all selector names in details', () => {
      document.body.innerHTML = '';
      const result = validateAllSelectors();
      for (const name of Object.keys(HH_SELECTORS)) {
        expect(result.details[name]).toBeDefined();
        expect(result.details[name].matched).toBeDefined();
        expect(result.details[name].count).toBeDefined();
      }
    });
  });

  describe('HH_SELECTORS structure', () => {
    it('has expected selector categories', () => {
      // Vacancy search
      expect(HH_SELECTORS.vacancyCard).toBeDefined();
      expect(HH_SELECTORS.vacancyTitleLink).toBeDefined();
      expect(HH_SELECTORS.vacancyCompany).toBeDefined();
      expect(HH_SELECTORS.vacancySalary).toBeDefined();
      expect(HH_SELECTORS.vacancyLocation).toBeDefined();
      expect(HH_SELECTORS.vacancyExperience).toBeDefined();
      expect(HH_SELECTORS.replyButton).toBeDefined();

      // Vacancy page
      expect(HH_SELECTORS.vacancyTitleOnPage).toBeDefined();
      expect(HH_SELECTORS.vacancyCompanyOnPage).toBeDefined();
      expect(HH_SELECTORS.vacancyDescription).toBeDefined();
      expect(HH_SELECTORS.vacancySkills).toBeDefined();
      expect(HH_SELECTORS.vacancyApplyButton).toBeDefined();

      // Resume
      expect(HH_SELECTORS.resumeTitle).toBeDefined();
      expect(HH_SELECTORS.resumeSkillsTable).toBeDefined();
      expect(HH_SELECTORS.resumeSkillTag).toBeDefined();

      // Negotiations
      expect(HH_SELECTORS.negotiationsList).toBeDefined();
      expect(HH_SELECTORS.negotiationsItem).toBeDefined();

      // Auth
      expect(HH_SELECTORS.loginEmailInput).toBeDefined();
      expect(HH_SELECTORS.loginPasswordInput).toBeDefined();
      expect(HH_SELECTORS.logged_in_indicator).toBeDefined();
    });

    it('all selectors are arrays with at least one entry', () => {
      for (const [name, selectors] of Object.entries(HH_SELECTORS)) {
        expect(Array.isArray(selectors)).toBe(true);
        expect(selectors.length).toBeGreaterThan(0);
        for (const sel of selectors) {
          expect(typeof sel).toBe('string');
          expect(sel.length).toBeGreaterThan(0);
        }
      }
    });
  });
});