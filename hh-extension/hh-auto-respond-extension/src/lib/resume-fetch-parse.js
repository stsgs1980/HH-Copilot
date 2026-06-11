/**
 * LIB: RESUME FETCH PARSE
 * ==========================
 * DOM-level parsers for fetched resume HTML: company card, personal data.
 * Education parser is in resume-fetch-parse-edu.js.
 */

import { safeGetText } from './resume-fetch-helpers.js';

// ═══════════════════════════════════════════════
// COMPANY CARD PARSER
// ═══════════════════════════════════════════════

export function parseCompanyCardFromDoc(card) {
  const job = {};

  const cellLeft = card.querySelector('[data-qa="cell-left-side"]');
  if (cellLeft) {
    const cellTexts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
    if (cellTexts.length >= 1) {
      job.company = (cellTexts[0].textContent || '').trim();
    }
    if (cellTexts.length >= 2) {
      job.duration = (cellTexts[1].textContent || '').trim();
    }
  }

  const stepContent = card.querySelector('[data-qa="magritte-stepper-step-content"]');
  if (stepContent) {
    const stepCellLeft = stepContent.querySelector('[data-qa="cell-left-side"]');
    if (stepCellLeft) {
      const stepTexts = stepCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      if (stepTexts.length >= 1) {
        job.position = (stepTexts[0].textContent || '').trim();
      }
      if (stepTexts.length >= 2) {
        let rawPeriod = (stepTexts[1].textContent || '').trim();
        rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, '').trim();
        job.period = rawPeriod;
      }
    }
    const fullStepText = (stepContent.textContent || '').trim();
    let desc = fullStepText;
    const posText = job.position || '';
    const periodText = job.period || '';
    if (posText && desc.startsWith(posText)) {
      desc = desc.substring(posText.length);
    }
    if (periodText && desc.startsWith(periodText)) {
      desc = desc.substring(periodText.length);
    }
    desc = desc.trim();
    if (desc.length > 20) {
      job.description = desc;
    }
  }

  return (job.company || job.position) ? job : null;
}

// ═══════════════════════════════════════════════
// PERSONAL DATA PARSER
// ═══════════════════════════════════════════════

const GENDER_PATTERNS = [/\bмужчина\b/i, /\bженщина\b/i, /\bмужской\b/i, /\bженский\b/i, /\bmale\b/i, /\bfemale\b/i];
const AGE_PATTERN = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
const AGE_PATTERN2 = /(\d{2})\s*years?\s*old/i;

export function parsePersonalDataFromDoc(doc, titleEl, dbg, resume) {
  const personalText = [];
  const posCard = doc.querySelector('[data-qa="resume-position-card"]');
  if (posCard) {
    posCard.querySelectorAll('span, div, p, a').forEach(el => {
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200) personalText.push(t);
    });
  }
  const titleContainer = titleEl ? titleEl.closest('div[data-qa], section') || titleEl.parentElement : null;
  if (titleContainer) {
    titleContainer.querySelectorAll('span, div, p, a').forEach(el => {
      if (el === titleEl || titleEl.contains(el)) return;
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200 && !personalText.includes(t)) personalText.push(t);
    });
  }

  for (const t of personalText) {
    if (!resume.gender) {
      for (const gp of GENDER_PATTERNS) {
        const m = t.match(gp);
        if (m) { resume.gender = dbg('resumeGender', m[0]); break; }
      }
    }
    if (!resume.age) {
      const m = t.match(AGE_PATTERN) || t.match(AGE_PATTERN2);
      if (m) { resume.age = dbg('resumeAge', m[1] + ' лет'); }
    }
    if (!resume.address && t.length > 3) {
      const isGender = GENDER_PATTERNS.some(p => p.test(t));
      const isAge = AGE_PATTERN.test(t) || AGE_PATTERN2.test(t);
      if (!isGender && !isAge && !t.includes('руб') && !t.includes('USD') &&
          !t.includes('з/п') && !t.includes('уровень') && !t.includes('доход') &&
          t !== resume.salary && t !== resume.title) {
        if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
          resume.address = dbg('resumeAddress', t);
        }
      }
    }
  }
}
