/**
 * PARSER: RESUME DETAIL -- parseCompanyCard()
 * ============================================
 * Parses a single experience company card element.
 */

// ===============================================
// PARSE SINGLE COMPANY CARD (Experience)
// ===============================================

export function parseCompanyCard(card) {
  const job = {};

  // -- Компания и длительность --
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

  // -- Позиция, период, описание --
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
    // Описание -- парсим по блочным элементам, сохраняя структуру абзацев
    // hh.ru использует .magritte-text, <p>, [data-qa="cell-text-content"] для абзацев описания
    // Извлекаем текст описания как массив строк (по абзацам)
    const descParagraphs = [];
    // Селекторы блочных текстовых элементов внутри stepContent
    const blockTexts = stepContent.querySelectorAll(
      '[data-qa="cell-text-content"], .magritte-text, p, [class*="text-"], li'
    );
    const posText = job.position || '';
    const periodText = job.period || '';
    const skipTexts = new Set();
    if (posText) skipTexts.add(posText);
    if (periodText) skipTexts.add(periodText);
    // Duration in parentheses: "(1 год и 7 месяцев)"
    if (job.duration) skipTexts.add(job.duration);

    blockTexts.forEach(el => {
      const t = (el.textContent || '').trim();
      if (!t || t.length < 2) return;
      // Skip position, period, duration texts (already parsed above)
      if (skipTexts.has(t)) return;
      // Skip if this is a parent element that contains position/period
      // (e.g., a wrapper div that has position + period as children)
      if (posText && t.startsWith(posText) && t.length <= posText.length + 50) {
        // Likely just position + period glued together, skip
        const remaining = t.substring(posText.length).trim();
        if (!remaining || skipTexts.has(remaining)) return;
      }
      // Skip short duration-like texts: "(1 год и 7 месяцев)"
      if (/^\(\d/.test(t) && /\)$/.test(t) && t.length < 40) return;
      // Skip if this element is inside a cell-left-side (position/period container)
      if (el.closest('[data-qa="cell-left-side"]') && !el.matches('li')) return;
      descParagraphs.push(t);
    });

    // Fallback: if no block texts found, try full textContent approach
    if (descParagraphs.length === 0) {
      const fullStepText = (stepContent.textContent || '').trim();
      let desc = fullStepText;
      if (posText && desc.startsWith(posText)) {
        desc = desc.substring(posText.length);
      }
      if (periodText && desc.startsWith(periodText)) {
        desc = desc.substring(periodText.length);
      }
      desc = desc.trim();
      if (desc.length > 20) {
        // Split on sentence boundaries that are glued together
        // ".X" -> ".\nX" (period followed by uppercase Cyrillic/Latin without space)
        desc = desc.replace(/\.\s*(?=[А-ЯЁA-Z])/g, '.\n');
        descParagraphs.push(...desc.split('\n').filter(s => s.trim().length > 0));
      }
    }

    if (descParagraphs.length > 0) {
      job.description = descParagraphs.join('\n');
    }
  }

  return (job.company || job.position) ? job : null;
}