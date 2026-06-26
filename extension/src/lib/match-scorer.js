/**
 * LIB: MATCH SCORER -- Orchestrator
 * ==================================
 * Computes a match score between a resume and a vacancy.
 * Thin orchestrator -- delegates to focused modules:
 *   - match-scorer-skills.js      -> skill overlap (0-35)
 *   - match-scorer-title.js       -> title similarity (0-25)
 *   - match-scorer-salary.js      -> salary fit (0-15)
 *   - match-scorer-experience.js  -> experience match (0-10)
 *   - match-scorer-location.js    -> location fit (0-15)
 *
 * Score breakdown (0-100):
 *   skills     0-35
 *   title      0-25
 *   salary     0-15
 *   experience 0-10
 *   location   0-15
 *
 * v1.9.23.0: split from monolith into 4 focused modules
 * v1.9.72.0: added location dimension, rebalanced weights (F7.2)
 *
 * Usage:
 *   const result = computeMatchScore(resume, vacancy);
 *   result.total       -> 0-100
 *   result.breakdown   -> { skills, title, salary, experience, location }
 *   result.details     -> { matchingSkills, missingSkills, ... }
 */

import { createLogger } from './anti-hallucination.js';
import { scoreSkills } from './match-scorer-skills.js';
import { scoreTitle } from './match-scorer-title.js';
import { scoreSalary } from './match-scorer-salary.js';
import { scoreExperience } from './match-scorer-experience.js';
import { scoreLocation } from './match-scorer-location.js';

const scoreLog = createLogger('Scorer');

// Weight multipliers: old max -> new max
// skills 40->35 (×0.875), title 30->25 (×0.833), salary 15->15 (×1.0), experience 15->10 (×0.667)
const W_SKILLS = 35 / 40;
const W_TITLE = 25 / 30;
const W_SALARY = 15 / 15;
const W_EXP = 10 / 15;
// location is a new module returning 0-15 directly, no multiplier needed

/**
 * Compute match score between a resume and a vacancy.
 * @param {Object} resume  -- parsed resume object (from parseResume)
 * @param {Object} vacancy -- parsed vacancy object (from parseVacancyDetail or vacancy-list)
 * @returns {{ total: number, breakdown: Object, details: Object }}
 */
export function computeMatchScore(resume, vacancy) {
  if (!resume || !vacancy) {
    return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0 }, details: {} };
  }

  const skillResult = scoreSkills(resume, vacancy);
  const titleResult = scoreTitle(resume, vacancy);
  const salaryResult = scoreSalary(resume, vacancy);
  const expResult = scoreExperience(resume, vacancy);
  const locResult = scoreLocation(resume, vacancy);

  const breakdown = {
    skills: Math.round(skillResult.score * W_SKILLS),
    title: Math.round(titleResult.score * W_TITLE),
    salary: Math.round(salaryResult.score * W_SALARY),
    experience: Math.round(expResult.score * W_EXP),
    location: locResult.score,
  };

  let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience + breakdown.location);

  // v1.9.35.0: Role mismatch penalty
  if (titleResult.score === 0 && titleResult.similarity === 0) {
    total = Math.min(total, 25);
  } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
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
    locationMatch: locResult.reason,
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience + ' loc=' + breakdown.location);

  return { total, breakdown, details };
}