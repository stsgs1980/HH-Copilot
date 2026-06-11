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
 * v1.9.19.0 changes:
 *   - normalizeSkillSet: hyphen/dash → space, ё → е ("B2B-Продажи" = "b2b продажи")
 *   - scoreSkills: neutral fallback 20→10 when vacancySkills empty
 *   - scoreSkills: uses vacancy.derivedSkills when no explicit keySkills
 *
 * Usage:
 *   const result = computeMatchScore(resume, vacancy);
 *   result.total       → 0–100
 *   result.breakdown   → { skills, title, salary, experience }
 *   result.details     → { matchingSkills, missingSkills, ... }
 */

import { createLogger } from './anti-hallucination.js';
import { parseExperienceString } from './parse-experience.js';
import { findSynonymMatch, SYNONYM_WEIGHT } from './skill-synonyms.js';

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
    derivedMatchSkills: skillResult.derivedMatch,
    synonymMatchSkills: skillResult.synonymMatch,
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
  const derivedSkills = normalizeSkillSet(resume.derivedSkills || []);
  // v1.9.19.0: Use vacancy.derivedSkills when no explicit keySkills
  let vacancySkillsRaw = vacancy.keySkills || vacancy.skills || [];
  if (vacancySkillsRaw.length === 0 && vacancy.derivedSkills && vacancy.derivedSkills.length > 0) {
    scoreLog.info('No vacancy keySkills — using derivedSkills (' + vacancy.derivedSkills.length + ')');
    vacancySkillsRaw = vacancy.derivedSkills;
  }
  const vacancySkills = normalizeSkillSet(vacancySkillsRaw);

  // Merge explicit + derived skills (derived at lower weight)
  const allResumeSkills = new Set([...resumeSkills, ...derivedSkills]);

  if (vacancySkills.size === 0) {
    // v1.9.19.0: Reduced neutral fallback from 20→10 (20 was too generous for "no data")
    return { score: 10, matching: [], missing: [], extra: [], derivedMatch: [] };
  }

  const matching = [];      // explicit skill match
  const derivedMatch = [];  // derived skill match
  const synonymMatch = [];  // synonym group match (v1.9.22.0)
  const missing = [];

  // All resume skills combined for synonym lookup
  const allResume = new Set([...resumeSkills, ...derivedSkills]);

  for (const skill of vacancySkills) {
    if (resumeSkills.has(skill)) {
      matching.push(skill);
    } else if (derivedSkills.has(skill)) {
      derivedMatch.push(skill);
    } else {
      // v1.9.22.0: Check synonym groups — "переговоры" matches "работа с возражениями"
      const synMatch = findSynonymMatch(skill, allResume);
      if (synMatch) {
        synonymMatch.push(skill + ' ≈ ' + synMatch);
      } else {
        missing.push(skill);
      }
    }
  }

  const extra = [];
  for (const skill of allResumeSkills) {
    if (!vacancySkills.has(skill)) extra.push(skill);
  }

  // Score: explicit matches count full, derived matches count 70%, synonyms count 50%
  // (derived skills are inferred, not self-declared)
  // (synonym skills are related but not identical — v1.9.22.0)
  const explicitWeight = 1.0;
  const derivedWeight = 0.7;
  const effectiveMatches = matching.length * explicitWeight +
    derivedMatch.length * derivedWeight +
    synonymMatch.length * SYNONYM_WEIGHT;
  const ratio = vacancySkills.size > 0 ? effectiveMatches / vacancySkills.size : 0;
  const score = Math.min(40, Math.round(ratio * 40));

  scoreLog.info('Skills: explicit=' + matching.length + ' derived=' + derivedMatch.length +
    ' synonym=' + synonymMatch.length + ' missing=' + missing.length + ' → ' + score + '/40');

  return { score, matching, missing, extra, derivedMatch, synonymMatch };
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
  let vacSalary = vacancy.salary || {};

  // Handle string salary from vacancy-list parser (e.g., "150 000 – 200 000 ₽")
  if (typeof vacSalary === 'string') {
    vacSalary = parseVacancySalaryString(vacSalary);
  }

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
  let vacExp = vacancy.experience || {};

  // Handle legacy string format from vacancy-list parser
  if (typeof vacExp === 'string') {
    vacExp = parseExperienceString(vacExp);
  }

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
  if (vacExp.min === null && vacExp.max === null) {
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

/**
 * Normalize skill names: lowercase, trim, unify separators.
 * v1.9.19.0: Added hyphen/dash → space, ё → е normalization.
 *   "B2B-Продажи" → "b2b продажи"
 *   "B2B Продажи" → "b2b продажи"  (same result)
 *   "Всё" → "все"
 */
function normalizeSkillSet(skills) {
  const set = new Set();
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    if (name) {
      set.add(
        name.toLowerCase().trim()
          .replace(/[-–—]/g, ' ')   // hyphens/dashes → space
          .replace(/ё/g, 'е')       // ё → е
          .replace(/\s+/g, ' ')     // collapse multiple spaces
      );
    }
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

/** Parse vacancy salary string like "150 000 – 200 000 ₽" into { min, max }. */
function parseVacancySalaryString(salaryStr) {
  if (!salaryStr || typeof salaryStr !== 'string') return {};
  // Remove currency symbols and normalize spaces
  const cleaned = salaryStr.replace(/[₽$€руб\.]/gi, '').replace(/\s+/g, ' ');
  // Find all number groups (e.g., "150 000" → "150000")
  const nums = cleaned.match(/\d[\d\s]*\d/g);
  if (!nums || nums.length === 0) return {};
  const parsed = nums.map(n => parseInt(n.replace(/\s/g, ''), 10)).filter(n => !isNaN(n));
  if (parsed.length === 0) return {};
  if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
  // Take first two numbers as min/max
  return { min: parsed[0], max: parsed[1] };
}
