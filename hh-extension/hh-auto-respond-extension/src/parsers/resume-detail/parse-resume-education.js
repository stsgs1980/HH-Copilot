/**
 * PARSER: RESUME DETAIL — Education Parser
 * ==========================================
 * Parses education section with 3-level fallback strategy.
 * Extracted from parseResume() due to size.
 */

import { createLogger } from '../../lib/anti-hallucination.js';

const resumeLog = createLogger('Resume');

// ═══════════════════════════════════════════════
// ОБРАЗОВАНИЕ (Education)
// data-qa="resume-list-card-education" — контейнер
// Стратегия: перебираем ВСЕ data-qa внутри блока,
// затем прямых детей, извлекаем текст + ссылки.
// НЕ полагаемся на конкретный data-qa шаблон для записей.
// ═══════════════════════════════════════════════

export function parseEducation(dbg, resume) {
  const eduCard = document.querySelector('[data-qa="resume-list-card-education"]');
  if (!eduCard) {
    resume._debug.missing.push('educationBlock (no data-qa="resume-list-card-education")');
    return;
  }

  resume._debug.found.push('educationBlock (data-qa="resume-list-card-education")');

  const eduEntries = [];

  // Способ 1: cell-based структура (как в experience)
  const eduUiTexts = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;
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
}