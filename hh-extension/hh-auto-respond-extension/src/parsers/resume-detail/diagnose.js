/**
 * PARSER: RESUME DETAIL — DOM DIAGNOSTIC
 * ========================================
 * Diagnostic tool that dumps all data-qa elements, resume blocks,
 * tags, selectors, headings, sections, and experience/education blocks.
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { HH_SELECTORS } from '../../lib/selectors.js';
import { getResumePageType } from './index.js';

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
