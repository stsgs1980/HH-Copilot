/**
 * PARSER: RESUME DETAIL -- Salary conditions (employment, format, schedule, relocation).
 * Extracted from parse-resume-personal.js for anti-monolith compliance.
 */

// ===============================================
// ЗАРПЛАТА И УСЛОВИЯ (employment, format, schedule, relocation)
// ===============================================

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

  // NOTE: \b does NOT work with Cyrillic in JS (\w = [a-zA-Z0-9_] only),
  //       so we use (^|\s) / ($|[,;\s]) boundaries instead.
  // hh.ru naming: "Полная занятость" or "Постоянная работа" -- same meaning
  const empPatterns = [
    /(?:^|\s)(Полная занятость|Постоянная работа)(?:$|[,;\s])/i,
    /(?:^|\s)(Частичная занятость)(?:$|[,;\s])/i,
    /(?:^|\s)(Проектная работа)(?:$|[,;\s])/i,
    /(?:^|\s)(Стажировка)(?:$|[,;\s])/i,
    /(?:^|\s)(Волонтёрство)(?:$|[,;\s])/i,
  ];
  // Work format: hh.ru writes "На месте работодателя", "Удалённо", "Гибрид"
  // Can be comma-separated: "На месте работодателя, Удалённо, Гибрид"
  const fmtPatterns = [
    /(?:^|\s)(На месте работодателя|Офис|В офисе)(?:$|[,;\s])/i,
    /(?:^|\s)(Удал[а-яё]+(?: работа)?|Удалённо)(?:$|[,;\s])/i,
    /(?:^|\s)(Гибрид|Смешанный формат)(?:$|[,;\s])/i,
  ];
  const schedPatterns = [
    /(?:^|\s)(Гибкий график)(?:$|[,;\s])/i, /(?:^|\s)(Полный день)(?:$|[,;\s])/i,
    /(?:^|\s)(Сменный график)(?:$|[,;\s])/i, /(?:^|\s)(Вахтовый метод)(?:$|[,;\s])/i,
  ];
  const relocPatterns = [
    /(?:^|\s)(Не готов к переезду)(?:$|[,;\s])/i, /(?:^|\s)(Готов к переезду)(?:$|[,;\s])/i,
    /(?:^|\s)(Хочу переехать)(?:$|[,;\s])/i,
  ];

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
