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
// ПЕРСОНАЛЬНЫЕ ДАННЫЕ (name, gender, age, address)
// ═══════════════════════════════════════════════

export function parsePersonalData(titleEl, dbg, resume) {
  const personalText = [];

  // Имя: hh.ru показывает имя вверху страницы резюме
  // Селектор: [data-qa="resume-block-title-position"] содержит должность,
  // но имя обычно в [data-qa="resume-personal-name"] или h2/h1 рядом
  const nameEl = document.querySelector('[data-qa="resume-personal-name"]');
  if (nameEl) {
    const nameText = (nameEl.textContent || '').trim();
    if (nameText && nameText.length > 1 && nameText.length < 100) {
      resume.name = dbg('resumeName (data-qa)', nameText);
    }
  }
  // Fallback: h2 или первый крупный текст перед position — часто содержит имя
  if (!resume.name) {
    const posCard = document.querySelector('[data-qa="resume-position-card"]');
    if (posCard) {
      // Первый span/div с русским текстом, который не совпадает с title
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
  const usedStepperElements = new Set();

  // Strategy 1: parse company cards
  uniqueCards.forEach(card => {
    const job = parseCompanyCard(card);
    if (job) expEntries.push(job);
    // Track which stepper elements are already covered by company cards
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  // Strategy 2: parse stepper items NOT covered by company cards
  // After expandHiddenSections(), some experiences may appear as stepper items
  // without a company-card wrapper
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    const alreadyParsed = expEntries.length;

    stepperItems.forEach(step => {
      // Skip stepper items already covered by company cards
      if (usedStepperElements.has(step)) return;
      // Skip if this stepper is nested inside a company card we already parsed
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
      // Try to find company info from sibling elements
      const parent = step.parentElement;
      if (parent) {
        const parentCellLeft = parent.querySelector('[data-qa="cell-left-side"]');
        if (parentCellLeft && parentCellLeft !== cellLeft) {
          const parentTexts = parentCellLeft.querySelectorAll('[data-qa="cell-text-content"]');
          if (parentTexts.length >= 1 && !job.company) {
            job.company = (parentTexts[0].textContent || '').trim();
          }
          if (parentTexts.length >= 2 && !job.duration) {
            job.duration = (parentTexts[1].textContent || '').trim();
          }
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

// ═══════════════════════════════════════════════
// ЗАРПЛАТА И УСЛОВИЯ (employment, format, schedule, relocation)
// ═══════════════════════════════════════════════

export function parseSalaryConditions(dbg, resume) {
  // hh.ru position card contains employment type, work format, schedule, relocation
  const posCard = document.querySelector('[data-qa="resume-position-card"]');
  if (!posCard) {
    resume._debug.missing.push('salaryConditions (no position-card)');
    return;
  }

  const texts = [];
  posCard.querySelectorAll('span, p, div').forEach(el => {
    // Only get direct/small text nodes, not deeply nested
    if (el.children.length > 5) return;
    const t = (el.textContent || '').trim();
    if (t && t.length > 2 && t.length < 100) texts.push(t);
  });

  // Employment type patterns
  const empPatterns = [
    /\b(Полная занятость)\b/i,
    /\b(Частичная занятость)\b/i,
    /\b(Проектная работа)\b/i,
    /\b(Стажировка)\b/i,
  ];
  // Work format patterns
  const fmtPatterns = [
    /\b(Удал[а-яё]+ работа)\b/i,
    /\b(Офис)\b/i,
    /\b(Гибрид)\b/i,
    /\b(Смешанный формат)\b/i,
  ];
  // Schedule patterns
  const schedPatterns = [
    /\b(Гибкий график)\b/i,
    /\b(Полный день)\b/i,
    /\b(Сменный график)\b/i,
    /\b(Вахтовый метод)\b/i,
  ];
  // Relocation patterns
  const relocPatterns = [
    /\b(Не готов к переезду)\b/i,
    /\b(Готов к переезду)\b/i,
    /\b(Хочу переехать)\b/i,
  ];

  for (const t of texts) {
    if (!resume.employmentType) {
      for (const p of empPatterns) { const m = t.match(p); if (m) { resume.employmentType = dbg('employmentType', m[1]); break; } }
    }
    if (!resume.workFormat) {
      for (const p of fmtPatterns) { const m = t.match(p); if (m) { resume.workFormat = dbg('workFormat', m[1]); break; } }
    }
    if (!resume.schedule) {
      for (const p of schedPatterns) { const m = t.match(p); if (m) { resume.schedule = dbg('schedule', m[1]); break; } }
    }
    if (!resume.relocation) {
      for (const p of relocPatterns) { const m = t.match(p); if (m) { resume.relocation = dbg('relocation', m[1]); break; } }
    }
  }
}

// ═══════════════════════════════════════════════
// КОНТАКТЫ (phone, email, telegram)
// ═══════════════════════════════════════════════

export function parseContacts(dbg, resume) {
  // Phone
  const phoneEl = document.querySelector('[data-qa="resume-contact-phone"] a, [data-qa="resume-contact-phone"]');
  if (phoneEl) {
    const t = (phoneEl.textContent || '').trim();
    if (t && /[\d+\-()]/.test(t)) {
      resume.phone = dbg('phone', t);
    }
  }

  // Email
  const emailEl = document.querySelector('[data-qa="resume-contact-email"] a, [data-qa="resume-contact-email"]');
  if (emailEl) {
    const t = (emailEl.textContent || '').trim();
    if (t && t.includes('@')) {
      resume.email = dbg('email', t);
    }
  }

  // Telegram — search for @username or t.me links
  const allLinks = document.querySelectorAll('a[href*="t.me/"]');
  for (const link of allLinks) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/t\.me\/(\w+)/);
    if (match) {
      resume.telegram = dbg('telegram', '@' + match[1]);
      break;
    }
  }
  // Fallback: text search for @username pattern in contacts area
  if (!resume.telegram) {
    const contactBlock = document.querySelector('[data-qa="resume-contacts-block"], [data-qa="resume-block-contacts"]');
    if (contactBlock) {
      const text = (contactBlock.textContent || '');
      const m = text.match(/@(\w{4,})/);
      if (m) resume.telegram = dbg('telegram', '@' + m[1]);
    }
  }
}