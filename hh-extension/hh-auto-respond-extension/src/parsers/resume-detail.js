/**
 * PARSER: RESUME DETAIL
 * =======================
 * Parses a single resume page (/resume/{hash}) and resume list page (/applicant/resumes).
 * Also includes DOM diagnostic tool and page type detection.
 */

import { safeGetText, createLogger } from '../lib/anti-hallucination.js';
import { HH_SELECTORS } from '../lib/selectors.js';

const resumeLog = createLogger('Resume');

// ═══════════════════════════════════════════════
// PAGE TYPE DETECTION
// ═══════════════════════════════════════════════

export function getResumePageType() {
  const path = window.location.pathname;
  if (/\/resume\/[a-f0-9]+/.test(path)) return 'resume';
  if (path.includes('/applicant/resumes')) return 'resume-list';
  return 'other';
}

// ═══════════════════════════════════════════════
// EXPAND HIDDEN SECTIONS
// ═══════════════════════════════════════════════

export async function expandHiddenSections() {
  const expandButtons = document.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
  const clicked = [];
  expandButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('посмотреть всё') || text.includes('показать все') || text.includes('показать ещё') ||
        text.includes('посмотреть все') || text.includes('развернуть') || text.includes('expand')) {
      try {
        btn.click();
        clicked.push(text);
      } catch (e) {}
    }
  });
  if (clicked.length > 0) {
    resumeLog.info('Expanded hidden sections: ' + clicked.join(', '));
    // Ждём подгрузки контента
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ═══════════════════════════════════════════════
// DOM DIAGNOSTIC
// ═══════════════════════════════════════════════

export function diagnoseResumeDOM() {
  console.log('%c[HH-AR][DIAG] ═══ DOM DIAGNOSTIC DUMP ═══', 'color:#2964FF;font-weight:bold;font-size:14px');
  console.log('[HH-AR][DIAG] URL:', window.location.href);
  console.log('[HH-AR][DIAG] Page type:', getResumePageType());

  // 1. Собираем ВСЕ data-qa
  const allQa = document.querySelectorAll('[data-qa]');
  const qaMap = {};
  allQa.forEach(el => {
    const qa = el.getAttribute('data-qa');
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().substring(0, 80);
    const key = qa;
    if (!qaMap[key]) qaMap[key] = [];
    qaMap[key].push({ tag, text: text || '(empty)', class: (el.className || '').toString().substring(0, 60) });
  });

  // Группируем по префиксу
  const groups = {};
  Object.keys(qaMap).sort().forEach(qa => {
    const prefix = qa.split('__')[0].split('-')[0].split('_')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(qa);
  });

  console.log('%c[HH-AR][DIAG] Total data-qa elements: ' + allQa.length, 'color:#22c55e');
 console.log('%c[HH-AR][DIAG] Unique data-qa values: ' + Object.keys(qaMap).length, 'color:#22c55e');

  // Таблица всех data-qa
  console.group('%c[HH-AR][DIAG] All data-qa values:', 'color:#2964FF');
 console.table(Object.keys(qaMap).sort().map(qa => ({
    'data-qa': qa,
    'count': qaMap[qa].length,
    'tag': qaMap[qa][0].tag,
    'sample_text': qaMap[qa][0].text,
    'sample_class': qaMap[qa][0].class
  })));
  console.groupEnd();

  // Группы
  console.group('%c[HH-AR][DIAG] Groups by prefix:', 'color:#2964FF');
  Object.keys(groups).sort().forEach(prefix => {
    console.log('%c  ' + prefix + ' (' + groups[prefix].length + '):', 'color:#f59e0b', groups[prefix].join(', '));
  });
  console.groupEnd();

  // 2. Ищем.resume-block элементы (основные контейнеры)
  console.group('%c[HH-AR][DIAG] Resume blocks (.resume-block, [data-qa*="resume"]):', 'color:#2964FF');
  const resumeBlocks = document.querySelectorAll('[data-qa*="resume"], .resume-block, [class*="resume"]');
 resumeBlocks.forEach((block, i) => {
    const qa = block.getAttribute('data-qa') || '(no data-qa)';
    const cls = (block.className || '').toString().substring(0, 100);
    const text = (block.textContent || '').trim().substring(0, 120);
    console.log('  Block #' + i + ':', { qa, cls, text });
  });
  console.groupEnd();

  // 3. Ищем bloko-tag элементы (навыки, языки)
  console.group('%c[HH-AR][DIAG] Bloko tags (.bloko-tag, [data-qa*="tag"]):', 'color:#2964FF');
  const tags = document.querySelectorAll('.bloko-tag, .bloko-tag__text, [data-qa*="tag"], [data-qa*="skill"]');
  const tagTexts = [];
  tags.forEach(tag => {
    const t = (tag.textContent || '').trim();
    if (t && t.length < 100 && !tagTexts.includes(t)) {
      tagTexts.push(t);
      console.log('  Tag:', t, '| data-qa:', tag.getAttribute('data-qa') || '(none)', '| class:', (tag.className || '').toString().substring(0, 60));
    }
  });
  console.log('  Total unique tags:', tagTexts.length);
  console.groupEnd();

  // 4. Проверяем конкретные селекторы из HH_SELECTORS
  console.group('%c[HH-AR][DIAG] Selector check (resume selectors):', 'color:#2964FF');
  const resumeSelectorKeys = Object.keys(HH_SELECTORS).filter(k => k.startsWith('resume'));
  resumeSelectorKeys.forEach(key => {
    const sels = HH_SELECTORS[key];
    let found = false;
    for (const sel of sels) {
      try {
        const el = document.querySelector(sel);
        if (el && document.body.contains(el)) {
          console.log('%c  ✓ ' + key + ' → ' + sel, 'color:#22c55e', 'text:', (el.textContent || '').trim().substring(0, 60));
          found = true;
          break;
        }
      } catch (e) {}
    }
    if (!found) {
      console.log('%c  ✗ ' + key + ' → none matched', 'color:#ef4444', 'tried:', sels);
    }
  });
  console.groupEnd();

  // 5. semantic structure — h1, h2, h3 headings
  console.group('%c[HH-AR][DIAG] Headings (h1-h3):', 'color:#2964FF');
  document.querySelectorAll('h1, h2, h3').forEach(h => {
    console.log('  ' + h.tagName + ':', (h.textContent || '').trim().substring(0, 100), '| data-qa:', h.getAttribute('data-qa') || '(none)');
  });
  console.groupEnd();

  // 6. Все секции resume-page
  console.group('%c[HH-AR][DIAG] Page sections (section, [data-qa*="block"]):', 'color:#2964FF');
  const sections = document.querySelectorAll('section, [data-qa*="block"], .bloko-column');
  sections.forEach((s, i) => {
    const qa = s.getAttribute('data-qa') || '(none)';
    const heading = s.querySelector('h2, h3, [data-qa*="title"]');
    const headingText = heading ? (heading.textContent || '').trim().substring(0, 80) : '(no heading)';
    console.log('  Section #' + i + ':', qa, '| heading:', headingText);
  });
  console.groupEnd();

  // 7. Детальный дамп EXPERIENCE блока
  console.group('%c[HH-AR][DIAG] Experience block inner structure:', 'color:#ef4444;font-weight:bold');
  const expCard = document.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    console.log('  experienceBlock FOUND, children:', expCard.children.length);
    // Все data-qa внутри
    const expQa = expCard.querySelectorAll('[data-qa]');
    expQa.forEach((el, i) => {
      console.log('  expQa[' + i + ']:', el.getAttribute('data-qa'), '| tag:', el.tagName, '| text:', (el.textContent || '').trim().substring(0, 100));
    });
    // Прямые дочерние элементы (1 уровень)
    Array.from(expCard.children).forEach((child, i) => {
      const qa = child.getAttribute('data-qa') || '(no data-qa)';
      const tag = child.tagName;
      const text = (child.textContent || '').trim().substring(0, 150);
      const subQa = Array.from(child.querySelectorAll('[data-qa]')).map(e => e.getAttribute('data-qa'));
      console.log('  child[' + i + ']:', { tag, qa, text, subDataQa: subQa });
    });
  } else {
    console.log('  experienceBlock NOT FOUND');
  }
  console.groupEnd();

  // 8. Детальный дамп EDUCATION блока
  console.group('%c[HH-AR][DIAG] Education block inner structure:', 'color:#ef4444;font-weight:bold');
  const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
  if (eduCard) {
    console.log('  educationBlock FOUND, children:', eduCard.children.length);
    const eduQa = eduCard.querySelectorAll('[data-qa]');
    eduQa.forEach((el, i) => {
      console.log('  eduQa[' + i + ']:', el.getAttribute('data-qa'), '| tag:', el.tagName, '| text:', (el.textContent || '').trim().substring(0, 100));
    });
    Array.from(eduCard.children).forEach((child, i) => {
      const qa = child.getAttribute('data-qa') || '(no data-qa)';
      const tag = child.tagName;
      const text = (child.textContent || '').trim().substring(0, 150);
      const subQa = Array.from(child.querySelectorAll('[data-qa]')).map(e => e.getAttribute('data-qa'));
      console.log('  child[' + i + ']:', { tag, qa, text, subDataQa: subQa });
    });
  } else {
    console.log('  educationBlock NOT FOUND');
  }
  console.groupEnd();

  console.log('%c[HH-AR][DIAG] ═══ END DUMP ═══', 'color:#2964FF;font-weight:bold');
  console.log('%c[HH-AR][DIAG] Скопируй ВЕСЬ вывод из консоли и отправь мне.', 'color:#ef4444;font-size:13px');
}

// ═══════════════════════════════════════════════
// PARSE SINGLE RESUME
// ═══════════════════════════════════════════════

export function parseResume() {
  const t0 = performance.now();
  const resume = {
    id: '', url: window.location.href,
    title: '', salary: '', gender: '', age: '', address: '',
    specializations: [], skills: [], skillLevels: {},
    experience: [], education: [], languages: [],
    additionalInfo: '', parsedAt: new Date().toISOString(),
    _debug: { found: [], missing: [] }
  };

  const hashMatch = window.location.pathname.match(/\/resume\/([a-f0-9]+)/);
  resume.id = hashMatch ? hashMatch[1] : '';

  const dbg = (key, val) => {
    if (val) resume._debug.found.push(key + ': ' + (typeof val === 'string' ? '"' + val.substring(0, 60) + '"' : val));
    else resume._debug.missing.push(key);
    return val;
  };

  // ═════════════════════════════════════════
  // ЗАГОЛОВОК И ЗАРПЛАТА
  // data-qa="resume-block-title-position" и resume-block-salary
  // ═════════════════════════════════════════
  const titleEl = document.querySelector('[data-qa="resume-block-title-position"]');
  if (titleEl) {
    resume.title = dbg('resumeTitle (data-qa)', safeGetText(titleEl));
  }
  // Fallback: h1
  if (!resume.title) {
    const h1 = document.querySelector('h1');
    if (h1) resume.title = dbg('resumeTitle (h1)', (h1.textContent || '').trim());
  }

  const salaryEl = document.querySelector('[data-qa="resume-block-salary"]');
  if (salaryEl) {
    resume.salary = dbg('resumeSalary (data-qa)', safeGetText(salaryEl));
  }

  // ═════════════════════════════════════════
  // ПЕРСОНАЛЬНЫЕ ДАННЫЕ — gender, age, address
  // Magritte не даёт data-qa для этих полей.
  // Парсим из текстового содержимого position-card и nearby.
  // ═════════════════════════════════════════
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

  // ═════════════════════════════════════════
  // НАВЫКИ (Skills)
  // data-qa="skills-card" — контейнер секции
  // [data-qa^="skill-tag-"] — теги навыков
  // [data-qa^="skill-level-title-"] — уровни
  // ═════════════════════════════════════════
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

  // ═════════════════════════════════════════
  // ОПЫТ РАБОТЫ (Experience)
  // data-qa="resume-list-card-experience" — контейнер секции
  // Внутри: profile-experience-company-card — каждая запись работы.
  // Структура карточки (подтверждена дампом 2026-06-09):
  //   card > cell > cell-left-side:
  //     cell-text > cell-text-content → Компания (1-й span)
  //     cell-text > cell-text-content → Длительность (2-й span)
  //   card > magritte-stepper > magritte-stepper-step > ...-content:
  //     cell > cell-left-side:
  //       cell-text > cell-text-content → Позиция (1-й span)
  //       cell-text > cell-text-content → Период (2-й span)
  //     Остальной текст → Описание
  //
  // ВНИМАНИЕ: hh.ru может скрывать часть записей опыта.
  // Ищем ВСЕ company-card на ВЕСЬТЕ странице, не только внутри expCard.
  // ═════════════════════════════════════════
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

  // Функция парсинга одной карточки
  function parseCompanyCard(card) {
    const job = {};

    // ── Компания и длительность ──
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

    // ── Позиция, период, описание ──
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
        // Убираем duration в скобках если есть (дублирует cellTexts[1])
        rawPeriod = rawPeriod.replace(/\s*\(\d[^)]+\)$/, '').trim();
        job.period = rawPeriod;
        }
      }
      // Описание — текст stepContent без позиции и периода
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

  // ═════════════════════════════════════════
  // ОБРАЗОВАНИЕ (Education)
  // data-qa="resume-list-card-education" — контейнер
  // Стратегия: перебираем ВСЕ data-qa внутри блока,
  // затем прямых детей, извлекаем текст + ссылки.
  // НЕ полагаемся на конкретный data-qa шаблон для записей.
  // ═════════════════════════════════════════
  const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
  if (eduCard) {
    resume._debug.found.push('educationBlock (data-qa="resume-list-card-education")');

    const eduEntries = [];

    // Способ 1: cell-based структура (как в experience)
    // eduCard > children: каждая запись образования.
    // Фильтруем UI-текст (заголовки, кнопки).
    const eduUiTexts = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;
    // Ищем все cell-left-side внутри eduCard (как в experience)
    const eduCells = eduCard.querySelectorAll('[data-qa="cell-left-side"]');
    resumeLog.info('Education: found ' + eduCells.length + ' cell-left-side elements');

    eduCells.forEach(cell => {
      const edu = {};
      const cellTexts = cell.querySelectorAll('[data-qa="cell-text-content"]');
      cellTexts.forEach(ct => {
        const t = (ct.textContent || '').trim();
        if (!t || t.length < 2) return;
        if (eduUiTexts.test(t)) return;
        if (!edu.name) {
          edu.name = t;
        } else if (!edu.description) {
          edu.description = t;
        } else if (!edu.year && /\d{4}/.test(t)) {
          edu.year = t.match(/\d{4}/)?.[0] || t;
        }
      });
      if (edu.name && !eduUiTexts.test(edu.name) && edu.name.length > 3) {
        eduEntries.push(edu);
      }
    });

    // Способ 2: если cell-left-side не дали результатов — прямые дети eduCard
    if (eduEntries.length === 0) {
      resumeLog.info('Education: fallback to direct children of eduCard');
      Array.from(eduCard.children).forEach(child => {
        const edu = {};
        const linkEl = child.querySelector('a');
        if (linkEl) {
          const t = (linkEl.textContent || '').trim();
          if (!eduUiTexts.test(t)) edu.name = t;
        }
        if (!edu.name) {
          const textEls = child.querySelectorAll('span, div, p');
          for (const el of textEls) {
            const t = (el.textContent || '').trim();
            if (t.length > 3 && /[А-Яа-яЁё]/.test(t) && !/^\d/.test(t) && !/\d{4}/.test(t) && !eduUiTexts.test(t)) {
              edu.name = t;
              break;
            }
          }
        }
        const spans = child.querySelectorAll('span, div');
        for (const sp of spans) {
          const t = (sp.textContent || '').trim();
          if (/^\d{4}$/.test(t) || (/\d{4}/.test(t) && t.length < 15)) {
            edu.year = t;
            break;
          }
        }
        if (edu.name && !eduUiTexts.test(edu.name) && edu.name.length > 2) {
          eduEntries.push(edu);
        }
      });
    }

    // Способ 3: если всё ещё пусто — берём весь текст eduCard и парсим
    if (eduEntries.length === 0) {
      resumeLog.info('Education: fallback to full text scan');
      const fullText = (eduCard.textContent || '').trim();
      // Ищем pattern: «Название ВУЗа ... год»
      const lines = fullText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 3);
      for (const line of lines) {
        if (/[А-Яа-яЁё]{3,}/.test(line) && line.length < 200) {
          const yearMatch = line.match(/(\d{4})/);
          eduEntries.push({
            name: line.replace(/\d{4}/g, '').trim().substring(0, 100),
            year: yearMatch ? yearMatch[1] : ''
          });
        }
      }
    }

    resume.education = eduEntries;
    if (eduEntries.length > 0) {
      resume._debug.found.push('education: ' + eduEntries.length + ' entries');
    } else {
      resume._debug.missing.push('education (0 entries extracted)');
    }
  } else {
    resume._debug.missing.push('educationBlock (no data-qa="resume-list-card-education")');
  }

  // ═════════════════════════════════════════
  // ЯЗЫКИ (Languages)
  // Нет отдельного data-qa для языков на данной странице.
  // Ищем fallback через text-scan всей страницы.
  // ═════════════════════════════════════════
  // Языки обычно отображаются как bloko-теги в отдельной секции
  // Попробуем найти через data-qa или bloko-tag
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
  // Note: если языков нет на странице — не помечаем как missing

  // ═════════════════════════════════════════
  // ДОП. ИНФОРМАЦИЯ
  // data-qa="resume-about-card"
  // ═════════════════════════════════════════
  const aboutCard = document.querySelector('[data-qa="resume-about-card"]');
  if (aboutCard) {
    const text = (aboutCard.textContent || '').trim();
    if (text.length > 10) {
      resume.additionalInfo = text;
      resume._debug.found.push('additionalBlock (data-qa="resume-about-card")');
    }
  }

  // ═════════════════════════════════════════
  // ИТОГО
  // ═════════════════════════════════════════
  const elapsed = (performance.now() - t0).toFixed(1);
  resumeLog.info('Resume parsed in ' + elapsed + 'ms');
  resumeLog.info('Found: ' + resume._debug.found.length + ' | Missing: ' + resume._debug.missing.length);
  resumeLog.info('Skills: ' + resume.skills.length + ' | Experience: ' + resume.experience.length + ' | Education: ' + resume.education.length);
  console.log('[HH-AR][Resume] Parsed resume:', JSON.stringify({
    id: resume.id, title: resume.title, salary: resume.salary,
    skills: resume.skills, experienceCount: resume.experience.length,
    educationCount: resume.education.length, languages: resume.languages,
    debug: resume._debug
  }, null, 2));

  return resume;
}

// ═══════════════════════════════════════════════
// PARSE RESUME LIST
// ═══════════════════════════════════════════════

export function parseResumeList() {
  const resumes = [];
  // Ищем все ссылки на резюме на странице
  const links = document.querySelectorAll('a[href*="/resume/"]');
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
    if (!hashMatch) return;
    const id = hashMatch[1];
    // Проверяем что не дубликат
    if (resumes.find(r => r.id === id)) return;
    resumes.push({
      id: id,
      title: safeGetText(link) || 'Без названия',
      url: href.startsWith('http') ? href : 'https://hh.ru' + href
    });
  });
  resumeLog.info('Resume list: ' + resumes.length + ' resumes found');
  return resumes;
}
