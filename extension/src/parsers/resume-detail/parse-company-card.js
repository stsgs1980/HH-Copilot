/**
 * PARSER: RESUME DETAIL -- parseCompanyCard()
 * ============================================
 * Parses a single experience company card element.
 */

import { parseCardHead, parseStepperJob } from "../../lib/resume-dom-cells.js";

// ===============================================
// PARSE SINGLE COMPANY CARD (Experience)
// ===============================================

export function parseCompanyCard(card) {
  const job = parseCardHead(card);

  // -- Позиция, период, описание --
  const stepContent = card.querySelector('[data-qa="magritte-stepper-step-content"]');
  if (stepContent) {
    Object.assign(job, parseStepperJob(stepContent));
    // Описание -- парсим по блочным элементам, сохраняя структуру абзацев
    // hh.ru использует .magritte-text, <p>, [data-qa="cell-text-content"] для абзацев описания
    // Извлекаем текст описания как массив строк (по абзацам)
    const descParagraphs = [];
    // Селекторы блочных текстовых элементов внутри stepContent
    const blockTexts = stepContent.querySelectorAll(
      '[data-qa="cell-text-content"], .magritte-text, p, [class*="text-"], li',
    );
    const posText = job.position || "";
    const periodText = job.period || "";
    const skipTexts = new Set();
    if (posText) skipTexts.add(posText);
    if (periodText) skipTexts.add(periodText);
    // Duration in parentheses: "(1 год и 7 месяцев)"
    if (job.duration) skipTexts.add(job.duration);

    blockTexts.forEach((el) => {
      const t = (el.textContent || "").trim();
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
      if (el.closest('[data-qa="cell-left-side"]') && !el.matches("li")) return;
      descParagraphs.push(t);
    });

    // Fallback: if no block texts found, try full textContent approach
    if (descParagraphs.length === 0) {
      const fullStepText = (stepContent.textContent || "").trim();
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
        desc = desc.replace(/\.\s*(?=[А-ЯЁA-Z])/g, ".\n");
        descParagraphs.push(...desc.split("\n").filter((s) => s.trim().length > 0));
      }
    }

    if (descParagraphs.length > 0) {
      job.description = descParagraphs.join("\n");
    }
  }

  return job.company || job.position ? job : null;
}
