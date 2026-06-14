/**
 * LIB: RESUME FETCH PARSE -- Education Parser
 * =============================================
 * DOM-level education parser from fetched resume HTML.
 * Split from resume-fetch-parse.js for anti-monolith compliance.
 */

// ===============================================
// EDUCATION PARSER
// ===============================================

const EDU_UI_TEXTS = /^(посмотреть всё|редактировать|образование|доп\.? образование|высшее|среднее|среднее специальное|добавить|добавить образование|среднее профессиональное)$/i;

/**
 * Parse education entries from an education card element.
 * Tries 3 methods: cell-based, direct children, full-text fallback.
 */
export function parseEducationFromDoc(eduCard) {
  const eduEntries = [];

  // Способ 1: cell-based
  const eduCells = eduCard.querySelectorAll('[data-qa="cell-left-side"]');
  eduCells.forEach(cell => {
    const edu = parseEduCell(cell);
    if (edu) eduEntries.push(edu);
  });

  // Способ 2: прямые дети eduCard
  if (eduEntries.length === 0) {
    Array.from(eduCard.children).forEach(child => {
      const edu = parseEduChild(child);
      if (edu) eduEntries.push(edu);
    });
  }

  // Способ 3: полный текст
  if (eduEntries.length === 0) {
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

  return eduEntries;
}

function parseEduCell(cell) {
  const edu = {};
  const cellTexts = cell.querySelectorAll('[data-qa="cell-text-content"]');
  cellTexts.forEach(ct => {
    const t = (ct.textContent || '').trim();
    if (!t || t.length < 2) return;
    if (EDU_UI_TEXTS.test(t)) return;
    if (!edu.name) {
      edu.name = t;
    } else if (!edu.description) {
      edu.description = t;
    } else if (!edu.year && /\d{4}/.test(t)) {
      edu.year = t.match(/\d{4}/)?.[0] || t;
    }
  });
  if (edu.name && !EDU_UI_TEXTS.test(edu.name) && edu.name.length > 3) return edu;
  return null;
}

function parseEduChild(child) {
  const edu = {};
  const linkEl = child.querySelector('a');
  if (linkEl) {
    const t = (linkEl.textContent || '').trim();
    if (!EDU_UI_TEXTS.test(t)) edu.name = t;
  }
  if (!edu.name) {
    const textEls = child.querySelectorAll('span, div, p');
    for (const el of textEls) {
      const t = (el.textContent || '').trim();
      if (t.length > 3 && /[А-Яа-яЁё]/.test(t) && !/^\d/.test(t) && !/\d{4}/.test(t) && !EDU_UI_TEXTS.test(t)) {
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
  if (edu.name && !EDU_UI_TEXTS.test(edu.name) && edu.name.length > 2) return edu;
  return null;
}
