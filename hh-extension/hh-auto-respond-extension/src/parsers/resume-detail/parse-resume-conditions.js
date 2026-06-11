/**
 * PARSER: RESUME DETAIL — Salary conditions (employment, format, schedule, relocation).
 * Extracted from parse-resume-personal.js for anti-monolith compliance.
 */

// ═══════════════════════════════════════════════
// ЗАРПЛАТА И УСЛОВИЯ (employment, format, schedule, relocation)
// ═══════════════════════════════════════════════

export function parseSalaryConditions(dbg, resume) {
  const posCard = document.querySelector('[data-qa="resume-position-card"]');
  if (!posCard) {
    resume._debug.missing.push('salaryConditions (no position-card)');
    return;
  }

  const texts = [];
  posCard.querySelectorAll('span, p, div').forEach(el => {
    if (el.children.length > 5) return;
    const t = (el.textContent || '').trim();
    if (t && t.length > 2 && t.length < 100) texts.push(t);
  });

  // hh.ru uses multiple naming conventions for employment types:
  //   «Полная занятость» or «Постоянная работа» — same meaning
  //   «Частичная занятость» — same as partial
  const empPatterns = [
    /\b(Полная занятость|Постоянная работа)\b/i,
    /\b(Частичная занятость)\b/i,
    /\b(Проектная работа)\b/i,
    /\b(Стажировка)\b/i,
    /\b(Волонтёрство)\b/i,
  ];
  // Work format: hh.ru writes «На месте работодателя», «Удалённо», «Гибрид»
  // Can be comma-separated: «На месте работодателя, Удалённо, Гибрид»
  const fmtPatterns = [
    /\b(На месте работодателя|Офис|В офисе)\b/i,
    /\b(Удал[а-яё]+(?: работа)?|Удалённо)\b/i,
    /\b(Гибрид|Смешанный формат)\b/i,
  ];
  const schedPatterns = [/\b(Гибкий график)\b/i, /\b(Полный день)\b/i, /\b(Сменный график)\b/i, /\b(Вахтовый метод)\b/i];
  const relocPatterns = [/\b(Не готов к переезду)\b/i, /\b(Готов к переезду)\b/i, /\b(Хочу переехать)\b/i];

  for (const t of texts) {
    if (!resume.employmentType) {
      for (const p of empPatterns) { const m = t.match(p); if (m) { resume.employmentType = dbg('employmentType', m[1]); break; } }
    }
    // Work format: collect ALL matches (comma-separated on hh.ru)
    if (!resume.workFormat) {
      const fmtMatches = [];
      for (const p of fmtPatterns) { const m = t.match(p); if (m) fmtMatches.push(m[1]); }
      if (fmtMatches.length > 0) {
        resume.workFormat = dbg('workFormat', fmtMatches.join(', '));
      }
    }
    if (!resume.schedule) { for (const p of schedPatterns) { const m = t.match(p); if (m) { resume.schedule = dbg('schedule', m[1]); break; } } }
    if (!resume.relocation) { for (const p of relocPatterns) { const m = t.match(p); if (m) { resume.relocation = dbg('relocation', m[1]); break; } } }
  }
}
