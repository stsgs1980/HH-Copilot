/**
 * MATCH SCORER: EXPERIENCE (0–15)
 * =================================
 * Experience requirement match between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Scoring:
 *   Within range              → 15/15
 *   No experience required    → 15/15
 *   Slightly below (≤1 year)  → 10/15
 *   Above max (overqualified) → 8/15 (NOT a penalty in Russian market)
 *   Unknown on either side    → 8/15 (neutral)
 *   Significantly below       → 3/15
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

import { parseExperienceString } from './parse-experience.js';

/**
 * Score experience match between resume and vacancy.
 * @param {Object} resume
 * @param {Object} vacancy
 * @returns {{ score: number, reason: string }}
 */
export function scoreExperience(resume, vacancy) {
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
  // Use == null to catch both null and undefined (defensive against empty string experience)
  if (vacExp.min == null && vacExp.max == null) {
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
