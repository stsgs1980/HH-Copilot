/**
 * MATCH SCORER: TITLE (0-30)
 * ============================
 * Title similarity between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Strategies:
 *   1. Exact match -> 30/30
 *   2. Keyword overlap (tokenized) -> up to 25/30
 *   3. Abbreviation/synonym bonus -> up to 5/30
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

/**
 * Score title similarity between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, similarity: number }}
 */
export function scoreTitle(resume, vacancy) {
  const resumeTitle = (resume.title || '').toLowerCase().trim();
  const vacancyTitle = (vacancy.title || '').toLowerCase().trim();

  if (!resumeTitle || !vacancyTitle) {
    return { score: 0, similarity: 0 };
  }

  // Strategy 1: exact match
  if (resumeTitle === vacancyTitle) {
    return { score: 30, similarity: 1.0 };
  }

  // Strategy 2: keyword overlap
  const resumeWords = tokenize(resumeTitle);
  const vacancyWords = tokenize(vacancyTitle);

  if (vacancyWords.length === 0) {
    return { score: 0, similarity: 0 };
  }

  let overlapCount = 0;
  for (const w of vacancyWords) {
    if (resumeWords.has(w)) overlapCount++;
  }

  const similarity = overlapCount / vacancyWords.size;

  // Strategy 3: check for common professional abbreviations/patterns
  const bonus = titleBonus(resumeTitle, vacancyTitle);

  const rawScore = (similarity * 25) + bonus;
  const score = Math.min(30, Math.round(rawScore));

  return { score, similarity: Math.round(similarity * 100) / 100 };
}

// ===============================================
// HELPERS
// ===============================================

/**
 * Bonus points for common title patterns:
 * e.g., "РОП" <-> "Руководитель отдела продаж"
 *       "PHP" <-> "php"
 */
function titleBonus(resumeTitle, vacancyTitle) {
  let bonus = 0;

  // Known abbreviation mappings
  const abbrMap = {
    'роп': 'руководитель отдела продаж',
    'c#': 'csharp',
    '.net': 'dotnet',
    'qa': 'quality assurance',
    'сисадмин': 'системный администратор',
    'программист': 'разработчик',
    'devops': 'devops',
    'frontend': 'фронтенд',
    'backend': 'бэкенд',
    'fullstack': 'фулстек',
  };

  for (const [abbr, full] of Object.entries(abbrMap)) {
    const resumeHas = resumeTitle.includes(abbr) || resumeTitle.includes(full);
    const vacancyHas = vacancyTitle.includes(abbr) || vacancyTitle.includes(full);
    if (resumeHas && vacancyHas) {
      bonus += 5;
      break; // only one bonus
    }
  }

  return Math.min(5, bonus);
}

/** Tokenize a title into a set of significant words. */
function tokenize(text) {
  const stopWords = new Set([
    'в', 'на', 'и', 'с', 'от', 'до', 'за', 'по', 'из', 'к', 'о', 'не', 'но',
    'или', 'для', 'как', 'при', 'без', 'the', 'a', 'an', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'and', 'or', 'from', 'by',
  ]);
  const words = new Set();
  text.split(/[\s\u2013\u2014\-/,|]+/).forEach(w => {
    const clean = w.replace(/[^a-zа-яё0-9#+.]/g, '').trim();
    if (clean.length >= 2 && !stopWords.has(clean)) words.add(clean);
  });
  return words;
}
