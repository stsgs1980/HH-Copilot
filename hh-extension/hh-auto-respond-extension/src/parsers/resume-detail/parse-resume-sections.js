/**
 * PARSER: RESUME DETAIL — Section Parsers
 * =========================================
 * Individual section parsers extracted from parseResume()
 * to keep the main module under 250 lines.
 * Covers: personal data, skills, experience, languages, about.
 */

import { safeGetText, createLogger } from '../../lib/anti-hallucination.js';
import { parseCompanyCard } from './parse-company-card.js';

const resumeLog = createLogger('Resume');

// ═══════════════════════════════════════════════
// ПЕРСОНАЛЬНЫЕ ДАННЫЕ (gender, age, address)
// ═══════════════════════════════════════════════

export function parsePersonalData(titleEl, dbg, resume) {
  const personalText = [];

  // Собираем текст из position-card и соседних блоков
  const posCard = document.querySelector('[data-qa="resume-position-card"]');
  if (posCard) {
    posCard.querySelectorAll('span, div, p, a').forEach(el => {
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200) personalText.push(t);
    });
  }
  // Fallback: текст вокруг заголовка
  const titleContainer = titleEl ? titleEl.closest('div[data-qa], section') || titleEl.parentElement : null;
  if (titleContainer) {
    titleContainer.querySelectorAll('span, div, p, a').forEach(el => {
      if (el === titleEl || titleEl.contains(el)) return;
      const t = (el.textContent || '').trim();
      if (t && t.length > 0 && t.length < 200 && !personalText.includes(t)) personalText.push(t);
    });
  }

  const genderPatterns = [/\bмужчина\b/i, /\bженщина\b/i, /\bмужской\b/i, /\bженский\b/i, /\bmale\b/i, /\bfemale\b/i];
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

// ═══════════════════════════════════════════════
// НАВЫКИ (Skills)
// ═══════════════════════════════════════════════

export function parseSkills(dbg, resume) {
  const skillsCard = document.querySelector('[data-qa="skills-card"]');

  if (skillsCard) {
    resume._debug.found.push('skillsBlock (data-qa="skills-card")');
    // Уровни навыков
    const skillLevelEls = skillsCard.querySelectorAll('[data-qa^="skill-level-title-"]');
    skillLevelEls.forEach(el => {
      const qa = el.getAttribute('data-qa') || '';
      const lvlMatch = qa.match(/skill-level-title-(\d)/);
      if (lvlMatch) {
        const lvl = lvlMatch[1];
        const text = (el.textContent || '').trim();
        const labels = { '3': 'Продвинутый', '2': 'Средний', '1': 'Начальный' };
        resume.skillLevels[lvl] = labels[lvl] || text;
        resume._debug.found.push('skillLevel' + lvl + ': ' + (labels[lvl] || text));
      }
    });
    // Теги навыков — data-qa="skill-tag-*"
    const skillTags = skillsCard.querySelectorAll('[data-qa^="skill-tag-"]');
    skillTags.forEach(tag => {
      const text = (tag.textContent || '').trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
    // Fallback: bloko-tag внутри skills-card (дополняет, не заменяет)
    const blokoTags = skillsCard.querySelectorAll('.bloko-tag__text');
    blokoTags.forEach(tag => {
      const text = (tag.textContent || '').trim();
      if (text && text.length > 0 && text.length < 100 && !resume.skills.includes(text)) {
        resume.skills.push(text);
      }
    });
  } else {
    resume._debug.missing.push('skillsBlock (no data-qa="skills-card")');
  }
  if (resume.skills.length > 0) {
    resume._debug.found.push('skills: ' + resume.skills.length + ' tags');
  } else if (!resume._debug.found.some(f => f.startsWith('skillsBlock'))) {
    resume._debug.missing.push('skills (no tags found)');
  }
}

// ═══════════════════════════════════════════════
// ОПЫТ РАБОТЫ (Experience)
// ═══════════════════════════════════════════════

export function parseExperience(dbg, resume) {
  const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');

  // Сначала ищем ВСЕ company-card на всей странице (могут быть вне expCard)
  const allCompanyCards = document.querySelectorAll('[data-qa="profile-experience-company-card"]');
  // Уникализируем по элементу (на случай вложенности)
  const uniqueCards = [];
  const cardSet = new Set();
  allCompanyCards.forEach(c => {
    if (!cardSet.has(c)) { cardSet.add(c); uniqueCards.push(c); }
  });
  resumeLog.info('Experience: total company-cards on page: ' + uniqueCards.length);

  const expEntries = [];
  uniqueCards.forEach(card => {
    const job = parseCompanyCard(card);
    if (job) expEntries.push(job);
  });

  if (expCard) {
    resume._debug.found.push('experienceBlock (data-qa="resume-list-card-experience")');
  } else {
    // expCard не найден, но company-card есть — всё равно парсим
    resume._debug.missing.push('experienceBlock (no container, but ' + uniqueCards.length + ' cards found)');
  }

  resume.experience = expEntries;
  if (expEntries.length > 0) {
    resume._debug.found.push('experience: ' + expEntries.length + ' entries');
  } else {
    resume._debug.missing.push('experience (0 entries extracted)');
  }
}

// ═══════════════════════════════════════════════
// ЯЗЫКИ И ДОП. ИНФОРМАЦИЯ
// ═══════════════════════════════════════════════

export function parseLanguagesAndAbout(dbg, resume) {
  // Языки обычно отображаются как bloko-теги в отдельной секции
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

  // Доп. информация
  const aboutCard = document.querySelector('[data-qa="resume-about-card"]');
  if (aboutCard) {
    const text = (aboutCard.textContent || '').trim();
    if (text.length > 10) {
      resume.additionalInfo = text;
      resume._debug.found.push('additionalBlock (data-qa="resume-about-card")');
    }
  }
}