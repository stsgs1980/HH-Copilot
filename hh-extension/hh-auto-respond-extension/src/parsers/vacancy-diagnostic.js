/**
 * VACANCY PAGE DIAGNOSTIC
 * ========================
 * Collects ALL available data from a hh.ru vacancy detail page (/vacancy/{id}).
 * Runs in content script isolated world. Sends results to page-world.js
 * via postMessage so user can access __hhVacDiag() from browser console.
 */

import { findElement, findAllElements, HH_SELECTORS } from '../lib/selectors.js';
import { safeGetText, safeGetAttr, createLogger } from '../lib/anti-hallucination.js';

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

  // ── 1. Test all known selectors ──
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

    // For skills — list all
    if ((name === 'vacancySkills' || name === 'vacancySkillsOnPage') && el) {
      const items = el.querySelectorAll('.bloko-tag__text, [data-qa="skills-element__skill"], [data-qa*="skill"]');
      const texts = [];
      items.forEach(item => {
        const t = (item.textContent || '').trim();
        if (t) texts.push(t);
      });
      result.selectors[name].items = texts;
      result.selectors[name].count = texts.length;
    }

    // For description — get length + snippet
    if (name === 'vacancyDescription' && el) {
      result.selectors[name].htmlLength = el.innerHTML.length;
      result.selectors[name].textLength = el.textContent.length;
      result.selectors[name].textSnippet = el.textContent.substring(0, 500).trim();
    }
  });

  // ── 2. Auto-detect: scan ALL data-qa attributes on the page ──
  const allDataQa = new Map();
  document.querySelectorAll('[data-qa]').forEach(el => {
    const qa = el.getAttribute('data-qa');
    if (!qa) return;
    // Group by prefix (before last __ or -)
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

  // ── 3. Auto-detect: common vacancy fields by heuristics ──
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

  // ── 4. Raw data: structured info blocks on the page ──
  result.rawData.infoBlocks = detectInfoBlocks();

  // Send to page-world.js
  window.postMessage({ type: 'HH-AR-VAC-DIAG', payload: result }, '*');
  diagLog.info('Vacancy diagnostic complete — use __hhVacDiag() in console');

  return result;
}

// ═══════════════════════════════════════════════
// HEURISTIC DETECTORS
// ═══════════════════════════════════════════════

function detectTitle() {
  // data-qa first
  const qa = document.querySelector('[data-qa="vacancy-title"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim(), tag: qa.tagName };
  // h1 fallback
  const h1 = document.querySelector('h1');
  if (h1) return { source: 'h1', value: h1.textContent.trim(), tag: 'H1' };
  return { source: null, value: null };
}

function detectCompany() {
  const qa = document.querySelector('[data-qa="vacancy-company-name"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim(), tag: qa.tagName, href: qa.href || null };
  // Sidebar company link
  const sideCompany = document.querySelector('.vacancy-company-name a, [class*="company-name"] a');
  if (sideCompany) return { source: 'class-heuristic', value: sideCompany.textContent.trim(), tag: sideCompany.tagName, href: sideCompany.href || null };
  return { source: null, value: null };
}

function detectSalary() {
  const qa = document.querySelector('[data-qa="vacancy-salary"], [data-qa="vacancy-serp__compensation"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  // Bloko salary
  const bloko = document.querySelector('.vacancy-salary, [class*="vacancy-salary"]');
  if (bloko) return { source: 'class-heuristic', value: bloko.textContent.trim() };
  // Heuristic: look for text matching salary pattern near the title
  const h1 = document.querySelector('h1');
  if (h1) {
    const parent = h1.parentElement;
    if (parent) {
      const salaryEl = Array.from(parent.children).find(c =>
        /[\d\u00A0]+\s*₽|[\d\u00A0]+\s*руб/i.test(c.textContent)
      );
      if (salaryEl) return { source: 'sibling-heuristic', value: salaryEl.textContent.trim() };
    }
  }
  return { source: null, value: null };
}

function detectLocation() {
  const qa = document.querySelector('[data-qa="vacancy-view-location"], [data-qa*="location"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

function detectExperience() {
  const qa = document.querySelector('[data-qa="vacancy-experience"], [data-qa*="experience"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

function detectEmployment() {
  const qa = document.querySelector('[data-qa="vacancy-employment-mode"], [data-qa*="employment"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

function detectSchedule() {
  const qa = document.querySelector('[data-qa="vacancy-work-schedule"], [data-qa*="schedule"]');
  if (qa) return { source: 'data-qa', value: qa.textContent.trim() };
  return { source: null, value: null };
}

function detectKeySkills() {
  // data-qa skills
  const qaSkills = document.querySelectorAll('[data-qa="skills-element"] .bloko-tag__text, [data-qa="skills-element__skill"]');
  if (qaSkills.length > 0) {
    const texts = [];
    qaSkills.forEach(el => { const t = (el.textContent || '').trim(); if (t) texts.push(t); });
    return { source: 'data-qa', value: texts, count: texts.length };
  }
  // Bloko tags fallback
  const tagSection = document.querySelector('[data-qa="skills-element"]');
  if (tagSection) {
    const tags = tagSection.querySelectorAll('.bloko-tag__text');
    const texts = [];
    tags.forEach(el => { const t = (el.textContent || '').trim(); if (t) texts.push(t); });
    return { source: 'bloko-tags', value: texts, count: texts.length };
  }
  return { source: null, value: null, count: 0 };
}

function detectDescription() {
  const qa = document.querySelector('[data-qa="vacancy-description"]');
  if (qa) {
    return {
      source: 'data-qa',
      found: true,
      textLength: qa.textContent.length,
      htmlLength: qa.innerHTML.length,
      textSnippet: qa.textContent.substring(0, 800).trim(),
      headings: extractHeadings(qa),
    };
  }
  return { source: null, found: false };
}

function detectBrandedDescription() {
  const branded = document.querySelector('[data-qa="vacancy-branded-description"], .vacancy-branded-description, [class*="branded"]');
  if (branded) {
    return {
      source: 'data-qa/class',
      found: true,
      textLength: branded.textContent.length,
      htmlLength: branded.innerHTML.length,
      textSnippet: branded.textContent.substring(0, 300).trim(),
    };
  }
  return { source: null, found: false };
}

function extractHeadings(root) {
  const headings = [];
  root.querySelectorAll('p > strong, h2, h3, h4, p > b').forEach(el => {
    const t = (el.textContent || '').trim();
    if (t.length > 5 && t.length < 150) headings.push(t);
  });
  return headings;
}

function detectInfoBlocks() {
  // Look for structured info items in the sidebar area of vacancy page
  const blocks = [];
  const infoItems = document.querySelectorAll('[data-qa*="vacancy-"]');

  // Deduplicate by data-qa
  const seen = new Set();
  infoItems.forEach(el => {
    const qa = el.getAttribute('data-qa');
    if (!qa || seen.has(qa)) return;
    seen.add(qa);
    blocks.push({
      dataQa: qa,
      tag: el.tagName,
      text: (el.textContent || '').substring(0, 120).trim().replace(/\s+/g, ' '),
      children: el.children.length,
    });
  });

  return blocks;
}
