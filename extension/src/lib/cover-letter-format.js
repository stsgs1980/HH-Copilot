/**
 * LIB: COVER LETTER FORMAT HELPERS
 * =================================
 * Formatting utilities for cover letter generation:
 *   - formatSkillList: natural Russian list rendering
 *   - restoreOriginalCase: normalize -> original-case skill names
 *   - pluralYears / pluralMonths: Russian pluralization
 *
 * Split from cover-letter-generator.js (AHG Rule 12).
 * v1.9.43.0
 */

/**
 * Format a list of skills as natural Russian text.
 * Examples: ["Python"], ["Python", "SQL"], ["Python", "SQL", "Docker"]
 * -> "Python", "Python и SQL", "Python, SQL и Docker"
 *
 * @param {string[]} skills
 * @returns {string}
 */
export function formatSkillList(skills) {
  if (!skills || skills.length === 0) return '';
  if (skills.length === 1) return skills[0];
  if (skills.length === 2) return skills[0] + ' и ' + skills[1];
  // 3+: comma-separated with "и" before last
  return skills.slice(0, -1).join(', ') + ' и ' + skills[skills.length - 1];
}

/**
 * Restore original-case skill names from normalized (lowercase) names.
 * The scorer normalizes skill names for matching, but we want to display
 * the original case in the cover letter (e.g., "Python" not "python").
 *
 * @param {string[]} normalizedSkills -- lowercase skill names from scorer
 * @param {Object} vacancy -- source for vacancy skill names
 * @param {Object|null} resume -- source for resume skill names
 * @returns {string[]} original-case skill names
 */
export function restoreOriginalCase(normalizedSkills, vacancy, resume) {
  if (!normalizedSkills || normalizedSkills.length === 0) return [];

  // Build a map: normalized -> original
  const caseMap = new Map();

  // Collect from vacancy: keySkills, skills, derivedSkills
  const vacSources = [vacancy.keySkills, vacancy.skills, vacancy.derivedSkills];
  for (const arr of vacSources) {
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      const name = typeof s === 'string' ? s : (s?.name || '');
      if (name) caseMap.set(normalizeSkillName(name), name);
    }
  }

  // Collect from resume: skills, derivedSkills
  if (resume) {
    const resSources = [resume.skills, resume.derivedSkills];
    for (const arr of resSources) {
      if (!Array.isArray(arr)) continue;
      for (const s of arr) {
        const name = typeof s === 'string' ? s : (s?.name || '');
        if (name) caseMap.set(normalizeSkillName(name), name);
      }
    }
  }

  // Map normalized names back to original case
  return normalizedSkills.map(ns => caseMap.get(ns) || ns);
}

/**
 * Normalize a skill name for case-insensitive matching.
 * Lowercases, replaces dashes with spaces, collapses whitespace,
 * converts ё -> е.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeSkillName(name) {
  return name.toLowerCase().trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * Pluralize "год/года/лет" based on number.
 *
 * @param {number} n
 * @returns {string}
 */
export function pluralYears(n) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (lastDigit > 1 && lastDigit < 5) return 'года';
  if (lastDigit === 1) return 'год';
  return 'лет';
}

/**
 * Pluralize "месяц/месяца/месяцев" based on number.
 *
 * @param {number} n
 * @returns {string}
 */
export function pluralMonths(n) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'месяцев';
  if (lastDigit > 1 && lastDigit < 5) return 'месяца';
  if (lastDigit === 1) return 'месяц';
  return 'месяцев';
}
