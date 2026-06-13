/**
 * Experience parsing — Strategies 1-3 (DOM-based).
 *
 * Parse experience entries from a DOM document using:
 * - Strategy 1: company cards (data-qa="profile-experience-company-card")
 * - Strategy 2: remaining stepper items not covered by company cards
 * - Strategy 3: fallback — all stepper items directly
 */
import { createLogger } from './anti-hallucination.js';
import { parseCompanyCardFromDoc } from './resume-fetch-parse.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Parse experience entries from a DOM document using Strategies 1-3.
 * @param {Document} doc - Parsed document from DOMParser
 * @param {object} resume - Resume object to populate (experience, _debug)
 * @returns {Array} Parsed experience entries
 */
export function parseExperienceFromDocStrategies1to3(doc, resume) {
  const allCards = doc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach(c => { if (!seen.has(c)) { seen.add(c); uniqueCards.push(c); } });

  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: parse company cards (each card wraps a stepper item)
  uniqueCards.forEach(card => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  const expCard = doc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    resume._debug.found.push('experienceBlock');

    // Strategy 2: parse remaining stepper items NOT covered by company cards
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = entries.length;

    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position || job.period) entries.push(job);
    });

    const stepperAdded = entries.length - alreadyParsed;
    if (stepperAdded > 0) {
      resume._debug.found.push('experience (stepper supplement): +' + stepperAdded);
    }

    // Strategy 3: if still 0 entries, try broader text-based parsing
    if (entries.length === 0) {
      const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
      allStepperItems.forEach(step => {
        const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
        if (!cellLeft) return;
        const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
        const job = {};
        if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
        if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
        if (job.position) entries.push(job);
      });
      if (entries.length > 0) {
        resume._debug.found.push('experience (stepper full fallback): ' + entries.length);
      }
    }
  } else {
    resume._debug.missing.push('experienceBlock (no container, ' + uniqueCards.length + ' cards)');
  }

  return entries;
}
