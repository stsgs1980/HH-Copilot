/**
 * PARSER: RESUME DETAIL -- Experience, Languages & About.
 * ========================================================
 * Skills parsing moved to parse-resume-skills.js.
 * Personal data, salary/conditions, contacts moved to parse-resume-personal.js.
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { parseSkills } from './parse-resume-skills.js';
import { parseCompanyCard } from './parse-company-card.js';

const resumeLog = createLogger('Resume');

// Re-export parseSkills for backward compatibility
export { parseSkills };

// ===============================================
// EXPERIENCE
// ===============================================

export function parseExperience(dbg, resume) {
  const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');

  const allCompanyCards = document.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const uniqueCards = [];
  const cardSet = new Set();
  allCompanyCards.forEach(c => {
    if (!cardSet.has(c)) { cardSet.add(c); uniqueCards.push(c); }
  });
  resumeLog.info('Experience: total company-cards on page: ' + uniqueCards.length);

  const expEntries = [];
  const usedStepperElements = new Set();

  // Strategy 1: parse company cards
  uniqueCards.forEach(card => {
    const job = parseCompanyCard(card);
    if (job) expEntries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  // Strategy 2: parse stepper items NOT covered by company cards
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = expEntries.length;

    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && cardSet.has(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) {
        let rawPeriod = (texts[1].textContent || '').trim();
        rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, '').trim();
        job.period = rawPeriod;
      }
      const parent = step.parentElement;
      if (parent) {
        const parentCellLeft = parent.querySelector('[data-qa="cell-left-side"]');
        if (parentCellLeft && parentCellLeft !== cellLeft) {
          const parentTexts = parentCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
          if (parentTexts.length >= 1 && !job.company) job.company = (parentTexts[0].textContent || '').trim();
          if (parentTexts.length >= 2 && !job.duration) job.duration = (parentTexts[1].textContent || '').trim();
        }
      }
      if (job.position || job.company) expEntries.push(job);
    });

    const stepperAdded = expEntries.length - alreadyParsed;
    if (stepperAdded > 0) {
      resumeLog.info('Experience: +' + stepperAdded + ' from stepper items not in company-cards');
      resume._debug.found.push('experience (stepper supplement): +' + stepperAdded);
    }
  }

  if (expCard) {
    resume._debug.found.push('experienceBlock (data-qa="resume-list-card-experience")');
  } else {
    resume._debug.missing.push('experienceBlock (no container, but ' + uniqueCards.length + ' cards found)');
  }

  resume.experience = expEntries;
  if (expEntries.length > 0) {
    resume._debug.found.push('experience: ' + expEntries.length + ' entries');
  } else {
    resume._debug.missing.push('experience (0 entries extracted)');
  }
}

// ===============================================
// LANGUAGES & ADDITIONAL INFO
// ===============================================

export function parseLanguagesAndAbout(dbg, resume) {
  const langTags = document.querySelectorAll('[data-qa="resume-about-card"] .bloko-tag__text, [data-qa="resume-position-card"] .bloko-tag__text');
  langTags.forEach(tag => {
    const t = (tag.textContent || '').trim();
    if (t && t.length > 0 && !resume.skills.includes(t)) {
      resume.languages.push(t);
    }
  });
  if (resume.languages.length > 0) {
    resume._debug.found.push('languages: ' + resume.languages.join(', '));
  }

  const aboutCard = document.querySelector('[data-qa="resume-about-card"]');
  if (aboutCard) {
    const text = (aboutCard.textContent || '').trim();
    if (text.length > 10) {
      resume.additionalInfo = text;
      resume._debug.found.push('additionalBlock (data-qa="resume-about-card")');
    }
  }
}
