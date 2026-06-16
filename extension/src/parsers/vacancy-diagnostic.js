/**
 * VACANCY PAGE DIAGNOSTIC
 * ========================
 * Collects ALL available data from a hh.ru vacancy detail page (/vacancy/{id}).
 * Runs in content script isolated world. Sends results to page-world.js
 * via postMessage so user can access __hhVacDiag() from browser console.
 *
 * Heuristic detectors are in vacancy-diagnostic-detectors.js.
 */

import { findElement, HH_SELECTORS } from '../lib/selectors.js';
import { safeGetText, safeGetAttr, createLogger } from '../lib/anti-hallucination.js';
import {
  detectTitle, detectCompany, detectSalary, detectLocation,
  detectExperience, detectEmployment, detectSchedule,
  detectKeySkills, detectDescription, detectBrandedDescription,
  detectInfoBlocks,
} from './vacancy-diagnostic-detectors.js';

const diagLog = createLogger('VacDiag');

/**
 * Run full vacancy page diagnostic.
 * Returns a structured object with all found data.
 */
export function diagnoseVacancyPage() {
  const path = window.location.pathname;
  const vacancyId = path.replace('/vacancy/', '').split('?')[0].split('#')[0];

  const result = {
    url: window.location.href,
    vacancyId,
    timestamp: new Date().toISOString(),
    selectors: {},
    autoDetect: {},
    rawData: {},
  };

  // 1. Test all known selectors
  const vacSelectors = [
    'vacancyTitleOnPage', 'vacancyCompanyOnPage', 'vacancyDescription',
    'vacancyDescriptionContent', 'vacancySkills', 'vacancySkillsOnPage',
    'vacancyApplyButton', 'responsePopup', 'addCoverLetter',
    'coverLetterInput', 'submitButton',
  ];

  vacSelectors.forEach(name => {
    const el = findElement(name);
    const selectors = HH_SELECTORS[name] || [];
    const matchIdx = el ? selectors.findIndex(sel => {
      try { return document.querySelector(sel) === el; } catch { return false; }
    }) : -1;

    result.selectors[name] = {
      found: el !== null,
      matchedSelector: matchIdx >= 0 ? selectors[matchIdx] : null,
      text: el ? safeGetText(el, '').substring(0, 200) : null,
      tag: el ? el.tagName : null,
      dataQa: el ? safeGetAttr(el, 'data-qa', '') : null,
      className: el ? (el.className || '').substring(0, 100) : null,
    };

    if ((name === 'vacancySkills' || name === 'vacancySkillsOnPage')) {
      const allSkills = document.querySelectorAll('[data-qa="skills-element"]');
      const texts = [];
      allSkills.forEach(item => {
        const tagText = item.querySelector('.bloko-tag__text');
        const t = tagText ? tagText.textContent.trim() : item.textContent.trim();
        if (t) texts.push(t);
      });
      result.selectors[name].items = texts;
      result.selectors[name].count = texts.length;
    }

    if (name === 'vacancyDescription' && el) {
      result.selectors[name].htmlLength = el.innerHTML.length;
      result.selectors[name].textLength = el.textContent.length;
      result.selectors[name].textSnippet = el.textContent.substring(0, 500).trim();
    }
  });

  // 2. Auto-detect: scan ALL data-qa attributes on the page
  const allDataQa = new Map();
  document.querySelectorAll('[data-qa]').forEach(el => {
    const qa = el.getAttribute('data-qa');
    if (!qa) return;
    const prefix = qa.replace(/[-_][^-_]+$/, '');
    if (!allDataQa.has(prefix)) {
      allDataQa.set(prefix, []);
    }
    allDataQa.get(prefix).push({
      qa,
      tag: el.tagName,
      text: (el.textContent || '').substring(0, 80).trim().replace(/\s+/g, ' '),
    });
  });
  result.autoDetect.dataQaGroups = Object.fromEntries(allDataQa);
  result.autoDetect.dataQaCount = allDataQa.size;

  // 3. Auto-detect: common vacancy fields by heuristics
  result.autoDetect.title = detectTitle();
  result.autoDetect.company = detectCompany();
  result.autoDetect.salary = detectSalary();
  result.autoDetect.location = detectLocation();
  result.autoDetect.experience = detectExperience();
  result.autoDetect.employment = detectEmployment();
  result.autoDetect.schedule = detectSchedule();
  result.autoDetect.keySkills = detectKeySkills();
  result.autoDetect.description = detectDescription();
  result.autoDetect.brandedDescription = detectBrandedDescription();

  // 4. Raw data: structured info blocks on the page
  result.rawData.infoBlocks = detectInfoBlocks();

  // Send to page-world.js
  window.postMessage({ type: 'HH-AR-VAC-DIAG', payload: result }, '*');
  diagLog.info('Vacancy diagnostic complete -- use __hhVacDiag() in console');

  return result;
}
