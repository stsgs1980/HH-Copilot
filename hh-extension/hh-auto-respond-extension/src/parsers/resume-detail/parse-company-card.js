/**
 * PARSER: RESUME DETAIL — parseCompanyCard()
 * ============================================
 * Parses a single experience company card element.
 */

// ═══════════════════════════════════════════════
// PARSE SINGLE COMPANY CARD (Experience)
// ═══════════════════════════════════════════════

export function parseCompanyCard(card) {
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