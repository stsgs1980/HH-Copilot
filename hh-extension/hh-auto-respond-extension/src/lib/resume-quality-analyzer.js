/**
 * RESUME QUALITY ANALYZER -- фасад.
 * Собирает результаты из специализированных модулей:
 *   - quality-ats.js      -> ATS-совместимость
 *   - quality-experience.js -> качество опыта
 *   - quality-flags.js    -> красные флаги, сильные стороны, рекомендации
 *
 * v1.9.21.0: Added vacancySkills parameter for vacancy-skill-gap recommendations.
 */

import { analyzeATS } from './quality-ats.js';
import { analyzeExperience } from './quality-experience.js';
import { detectRedFlags, detectStrengths } from './quality-flags.js';
import { buildRecommendations } from './quality-recommendations.js';

/**
 * Полный анализ качества резюме.
 * Общий балл: 40% ATS + 40% опыт + 20% базис - штраф за красные флаги.
 *
 * @param {Object} r -- Resume object
 * @param {Set<string>} [vacancySkills] -- Normalized vacancy skills (from vacancy-skills-collector)
 */
export function analyzeResumeQuality(r, vacancySkills) {
  if (!r || !r.id) return {
    totalScore: 0, atsScore: 0, experienceScore: 0,
    redFlags: [], strengths: [], recommendations: [],
    details: { ats: { score: 0, checks: [] }, experience: { score: 0, checks: [], metrics: {} } }
  };

  const ats = analyzeATS(r);
  const exp = analyzeExperience(r);
  const flags = detectRedFlags(r);
  const strengths = detectStrengths(r);
  const recommendations = buildRecommendations(ats, exp, flags, r, vacancySkills);

  const flagPenalty = Math.min(30, flags.length * 7);
  const totalScore = Math.max(0, Math.round(
    ats.score * 0.4 + exp.score * 0.4 + 100 * 0.2 - flagPenalty
  ));

  return {
    totalScore,
    atsScore: ats.score,
    experienceScore: exp.score,
    redFlags: flags,
    strengths,
    recommendations,
    details: { ats, experience: exp }
  };
}
