/**
 * LIB: MATCH SCORER -- Orchestrator
 * ==================================
 * Computes a match score between a resume and a vacancy.
 * Thin orchestrator -- delegates to focused modules:
 *   - match-scorer-skills.js      -> skill overlap (0-40)
 *   - match-scorer-title.js       -> title similarity (0-30)
 *   - match-scorer-salary.js      -> salary fit (0-15)
 *   - match-scorer-experience.js  -> experience match (0-15)
 *
 * Score breakdown (0-100):
 *   skills     0-40
 *   title      0-30
 *   salary     0-15
 *   experience 0-15
 *
 * v1.9.23.0: split from monolith into 4 focused modules
 *
 * Usage:
 *   const result = computeMatchScore(resume, vacancy);
 *   result.total       -> 0-100
 *   result.breakdown   -> { skills, title, salary, experience }
 *   result.details     -> { matchingSkills, missingSkills, ... }
 */

import { createLogger } from './anti-hallucination.js';
import { scoreSkills } from './match-scorer-skills.js';
import { scoreTitle } from './match-scorer-title.js';
import { scoreSalary } from './match-scorer-salary.js';
import { scoreExperience } from './match-scorer-experience.js';

const scoreLog = createLogger('Scorer');

/**
 * Compute match score between a resume and a vacancy.
 * @param {Object} resume  -- parsed resume object (from parseResume)
 * @param {Object} vacancy -- parsed vacancy object (from parseVacancyDetail or vacancy-list)
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

  let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience);

  // v1.9.35.0: Role mismatch penalty
  // If title similarity is 0 (completely different profession -- e.g. "курьер" vs "руководитель отдела продаж"),
  // the vacancy is NOT a match regardless of skill/salary/experience overlap.
  // Without this, a courier job with 1 matching generic skill could score 50%+.
  if (titleResult.score === 0 && titleResult.similarity === 0) {
    // Hard cap: different profession = max 25% total
    total = Math.min(total, 25);
  } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
    // Soft cap: barely related role (1 common word like "руководитель" in different context)
    total = Math.min(total, 40);
  }

  const details = {
    matchingSkills: skillResult.matching,
    derivedMatchSkills: skillResult.derivedMatch,
    synonymMatchSkills: skillResult.synonymMatch,
    impliedMatchSkills: skillResult.impliedMatch,
    missingSkills: skillResult.missing,
    extraSkills: skillResult.extra,
    titleSimilarity: titleResult.similarity,
    salaryMatch: salaryResult.reason,
    experienceMatch: expResult.reason,
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience);

  return { total, breakdown, details };
}
