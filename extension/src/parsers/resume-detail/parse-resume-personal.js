/**
 * PARSER: RESUME DETAIL -- Personal data (name, gender, age, address).
 * Salary conditions -> parse-resume-conditions.js
 * Contacts -> parse-resume-contacts.js
 */

import { createLogger } from '../../lib/anti-hallucination.js';

const _resumeLog = createLogger('Resume');

// ===============================================
// ПЕРСОНАЛЬНЫЕ ДАННЫЕ (name, gender, age, address)
// ===============================================

export function parsePersonalData(titleEl, dbg, resume) {
  const personalText = [];

  // Имя: hh.ru показывает имя вверху страницы резюме
  const nameEl = document.querySelector('[data-qa="resume-personal-name"]');
  if (nameEl) {
    const nameText = (nameEl.textContent || '').trim();
    if (nameText && nameText.length > 1 && nameText.length < 100) {
      resume.name = dbg('resumeName (data-qa)', nameText);
    }
  }
  if (!resume.name) {
    const posCard = document.querySelector('[data-qa="resume-position-card"]');
    if (posCard) {
      const candidates = posCard.querySelectorAll('span, div, p, h1, h2, h3');
      for (const el of candidates) {
        const t = (el.textContent || '').trim();
        if (t && t.length > 2 && t.length < 80 && t !== resume.title && t !== resume.salary &&
            /^[А-ЯЁ][а-яё]+ [А-ЯЁ]/.test(t) && !/\d/.test(t)) {
          resume.name = dbg('resumeName (fallback)', t);
          break;
        }
      }
    }
  }

  // Собираем текст из position-card и соседних блоков
  const posCard = document.querySelector('[data-qa="resume-position-card"]');
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

  const genderPatterns = [/(?:^|\s)(мужчина|женщина|мужской|женский|male|female)(?:$|\s)/i];
  const agePattern = /(?:полных\s*)?(\d{2})\s*(?:лет|год|года)/i;
  const agePattern2 = /(\d{2})\s*years?\s*old/i;

  for (const t of personalText) {
    if (!resume.gender) {
      for (const gp of genderPatterns) {
        const m = t.match(gp);
        if (m) { resume.gender = dbg('resumeGender', m[0]); break; }
      }
    }
    if (!resume.age) {
      const m = t.match(agePattern) || t.match(agePattern2);
      if (m) { resume.age = dbg('resumeAge', m[1] + ' лет'); }
    }
    if (!resume.address && t.length > 3) {
      const isGender = genderPatterns.some(p => p.test(t));
      const isAge = agePattern.test(t) || agePattern2.test(t);
      const isName = resume.name && t === resume.name;
      if (!isGender && !isAge && !isName && !t.includes('руб') && !t.includes('USD') &&
          !t.includes('з/п') && !t.includes('уровень') && !t.includes('доход') &&
          t !== resume.salary && t !== resume.title) {
        if (/[А-Яа-яЁё]{2,}/.test(t) && t.length < 80) {
          resume.address = dbg('resumeAddress', t);
        }
      }
    }
  }
}
