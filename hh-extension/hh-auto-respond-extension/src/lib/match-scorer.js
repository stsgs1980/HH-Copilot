/**
 * LIB: MATCH SCORER
 * ===================
 * Computes a match score between a resume and a vacancy.
 *
 * Score breakdown (0–100):
 *   skills     0–40  — overlap between resume skills and vacancy keySkills
 *   title      0–30  — title similarity (keyword overlap + fuzzy)
 *   salary     0–15  — salary range compatibility
 *   experience 0–15  — experience requirement match
 *
 * Usage:
 *   const result = computeMatchScore(resume, vacancy);
 *   result.total       → 0–100
 *   result.breakdown   → { skills, title, salary, experience }
 *   result.details     → { matchingSkills, missingSkills, ... }
 */

import { createLogger } from './anti-hallucination.js';

const scoreLog = createLogger('Scorer');

/**
 * Compute match score between a resume and a vacancy.
 * @param {Object} resume  — parsed resume object (from parseResume)
 * @param {Object} vacancy — parsed vacancy object (from parseVacancyDetail or vacancy-list)
 * @returns {{ total: number, breakdown: Object, details: Object }}
 */
export function computeMatchScore(resume, vacancy) {
  if (!resume || !vacancy) {
    return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0 }, details: {} };
  }

  const skillResult = scoreSkills(resume, vacancy);
  const titleResult = scoreTitle(resume, vacancy);
  const salaryResult = scoreSalary(resume, vacancy);
  const expResult = scoreExperience(resume, vacancy);

  const breakdown = {
    skills: skillResult.score,
    title: titleResult.score,
    salary: salaryResult.score,
    experience: expResult.score,
  };

  const total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience);

  const details = {
    matchingSkills: skillResult.matching,
    missingSkills: skillResult.missing,
    extraSkills: skillResult.extra,
    titleSimilarity: titleResult.similarity,
    salaryMatch: salaryResult.reason,
    experienceMatch: expResult.reason,
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience);

  return { total, breakdown, details };
}

// ═══════════════════════════════════════════════
// SKILL OVERLAP (0–40)
// ═══════════════════════════════════════════════

function scoreSkills(resume, vacancy) {
  const resumeSkills = normalizeSkillSet(resume.skills || []);
  const vacancySkills = normalizeSkillSet(vacancy.keySkills || vacancy.skills || []);

  if (vacancySkills.size === 0) {
    // No skills listed in vacancy — give neutral score
    return { score: 20, matching: [], missing: [], extra: [] };
  }

  const matching = [];
  const missing = [];

  for (const skill of vacancySkills) {
    if (resumeSkills.has(skill)) {
      matching.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const extra = [];
  for (const skill of resumeSkills) {
    if (!vacancySkills.has(skill)) extra.push(skill);
  }

  // Score: (matching / total_vacancy_skills) * 40
  const ratio = vacancySkills.size > 0 ? matching.length / vacancySkills.size : 0;
  const score = Math.round(ratio * 40);

  return { score, matching, missing, extra };
}

// ═══════════════════════════════════════════════
// TITLE SIMILARITY (0–30)
// ═══════════════════════════════════════════════

function scoreTitle(resume, vacancy) {
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

/**
 * Bonus points for common title patterns:
 * e.g., "РОП" ↔ "Руководитель отдела продаж"
 *       "PHP" ↔ "php"
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

// ═══════════════════════════════════════════════
// SALARY FIT (0–15)
// ═══════════════════════════════════════════════

function scoreSalary(resume, vacancy) {
  // Parse resume salary expectation
  const resumeSalary = parseResumeSalary(resume.salary || '');
  const vacSalary = vacancy.salary || {};

  // If no salary info on either side — neutral score
  if (!resumeSalary && !vacSalary.min && !vacSalary.max) {
    return { score: 8, reason: 'no-data' };
  }

  if (!resumeSalary) {
    return { score: 8, reason: 'resume-no-salary' };
  }

  if (!vacSalary.min && !vacSalary.max) {
    return { score: 8, reason: 'vacancy-no-salary' };
  }

  // Check overlap between resume expectation and vacancy range
  const vacMin = vacSalary.min || 0;
  const vacMax = vacSalary.max || Infinity;

  // Resume salary within vacancy range
  if (resumeSalary >= vacMin && resumeSalary <= vacMax) {
    return { score: 15, reason: 'within-range' };
  }

  // Resume salary slightly below vacancy min (within 20%)
  if (resumeSalary < vacMin && resumeSalary >= vacMin * 0.8) {
    return { score: 12, reason: 'slightly-below' };
  }

  // Resume salary slightly above vacancy max (within 20%)
  if (resumeSalary > vacMax && resumeSalary <= vacMax * 1.2) {
    return { score: 10, reason: 'slightly-above' };
  }

  // Resume salary way below
  if (resumeSalary < vacMin) {
    return { score: 5, reason: 'below-range' };
  }

  // Resume salary way above
  return { score: 3, reason: 'above-range' };
}

// ═══════════════════════════════════════════════
// EXPERIENCE MATCH (0–15)
// ═══════════════════════════════════════════════

function scoreExperience(resume, vacancy) {
  const vacExp = vacancy.experience || {};

  // If vacancy requires no experience
  if (vacExp.min === 0 && vacExp.max === 0) {
    return { score: 15, reason: 'no-experience-required' };
  }

  // Calculate resume total experience from experience[] array
  const resumeYears = calcResumeYears(resume.experience || []);

  // If we can't determine resume experience
  if (resumeYears === null) {
    return { score: 8, reason: 'unknown-resume-exp' };
  }

  // If we can't determine vacancy experience requirement
  if (!vacExp.min && !vacExp.max && !vacExp.raw) {
    return { score: 8, reason: 'unknown-vacancy-exp' };
  }

  const vacMin = vacExp.min || 0;
  const vacMax = vacExp.max || 99;

  // Resume experience within required range
  if (resumeYears >= vacMin && resumeYears <= vacMax) {
    return { score: 15, reason: 'within-range' };
  }

  // Resume slightly below minimum (within 1 year)
  if (resumeYears < vacMin && resumeYears >= vacMin - 1) {
    return { score: 10, reason: 'slightly-below' };
  }

  // Resume above maximum (overqualified)
  if (resumeYears > vacMax) {
    return { score: 8, reason: 'overqualified' };
  }

  // Resume significantly below minimum
  return { score: 3, reason: 'below-range' };
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/** Normalize skill names: lowercase, trim, unify separators. */
function normalizeSkillSet(skills) {
  const set = new Set();
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    if (name) set.add(name.toLowerCase().trim().replace(/\s+/g, ' '));
  }
  return set;
}

/** Tokenize a title into a set of significant words. */
function tokenize(text) {
  const stopWords = new Set([
    'в', 'на', 'и', 'с', 'от', 'до', 'за', 'по', 'из', 'к', 'о', 'не', 'но',
    'или', 'для', 'как', 'при', 'без', 'the', 'a', 'an', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'and', 'or', 'from', 'by',
  ]);
  const words = new Set();
  text.split(/[\s\-–—/,|]+/).forEach(w => {
    const clean = w.replace(/[^a-zа-яё0-9#+.]/g, '').trim();
    if (clean.length >= 2 && !stopWords.has(clean)) words.add(clean);
  });
  return words;
}

/** Parse resume salary string into a number. */
function parseResumeSalary(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return null;
  const nums = salaryStr.match(/\d[\d\s]*\d/g);
  if (!nums || nums.length === 0) return null;
  // Take the first number (expected salary)
  return parseInt(nums[0].replace(/\s/g, ''), 10) || null;
}

/** Calculate total years of experience from resume experience array. */
function calcResumeYears(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return null;

  let totalMonths = 0;
  for (const exp of experience) {
    if (exp.duration && typeof exp.duration === 'object') {
      totalMonths += (exp.duration.years || 0) * 12 + (exp.duration.months || 0);
    } else if (typeof exp.duration === 'string') {
      const yearMatch = exp.duration.match(/(\d+)\s*(год|лет)/i);
      const monthMatch = exp.duration.match(/(\d+)\s*мес/i);
      if (yearMatch) totalMonths += parseInt(yearMatch[1], 10) * 12;
      if (monthMatch) totalMonths += parseInt(monthMatch[1], 10);
    }
  }

  if (totalMonths === 0) return null;
  return Math.round(totalMonths / 12 * 10) / 10;
}
