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
import { computeSemanticSimilarity } from './ai-semantic.js';

const scoreLog = createLogger('Scorer');

const WEIGHT_PROFILES = {
  precise: { skills: 35, title: 25, salary: 15, experience: 10, location: 15 },
  flexible: { title: 45, experience: 20, salary: 15, skills: 15, location: 5 }
};

export async function computeMatchScore(resume, vacancy, mode = 'precise') {
  if (!resume || !vacancy) {
    return { total: 0, breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0, semantic: 0 }, details: {} };
  }

  const profile = WEIGHT_PROFILES[mode] || WEIGHT_PROFILES.precise;

  let semanticScore = 0;
  if (mode === 'flexible') {
    semanticScore = await computeSemanticSimilarity(resume, vacancy);
  }

  const skillResult = scoreSkills(resume, vacancy);
  const titleResult = scoreTitle(resume, vacancy);
  const salaryResult = scoreSalary(resume, vacancy);
  const expResult = scoreExperience(resume, vacancy);
  const locResult = scoreLocation(resume, vacancy);

  const breakdown = {
    skills: Math.round(skillResult.score * (profile.skills / 40)),
    title: Math.round(titleResult.score * (profile.title / 30)),
    salary: Math.round(salaryResult.score * (profile.salary / 15)),
    experience: Math.round(expResult.score * (profile.experience / 15)),
    location: locResult.score,
    semantic: mode === 'flexible' ? Math.round(semanticScore * 45) : 0,
  };

  let total = Math.min(100, breakdown.skills + breakdown.title + breakdown.salary + breakdown.experience + breakdown.location + breakdown.semantic);

  // Role mismatch penalty (only in precise mode)
  if (mode === 'precise') {
    if (titleResult.score === 0 && titleResult.similarity === 0) {
      total = Math.min(total, 25);
    } else if (titleResult.similarity > 0 && titleResult.similarity < 0.15) {
      total = Math.min(total, 40);
    }
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
    semanticScore: semanticScore,
  };

  scoreLog.info('Score ' + total + '%: skills=' + breakdown.skills + ' title=' + breakdown.title + ' salary=' + breakdown.salary + ' exp=' + breakdown.experience + ' loc=' + breakdown.location + ' semantic=' + breakdown.semantic);

  return { total, breakdown, details };
}
