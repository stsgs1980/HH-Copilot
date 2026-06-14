/**
 * QUALITY RECOMMENDATIONS — prioritized improvement suggestions.
 *
 * Extracted from quality-flags.js for anti-monolith compliance.
 *
 * v1.9.21.0: Replaced noisy "skills not in experience descriptions" with
 * actionable vacancy-skill-gap recommendations.
 * v1.9.22.0: Skills with synonym matches shown separately as "related" (lower priority).
 */

import { findSynonymMatch } from './skill-synonyms.js';
import { getRoleImpliedSkills } from './role-implied-skills.js';

/**
 * Build prioritized recommendations for resume improvement.
 *
 * @param {Object} ats — ATS analysis result
 * @param {Object} exp — Experience analysis result
 * @param {string[]} flags — Red flags
 * @param {Object} r — Resume object
 * @param {Set<string>} [vacancySkills] — Normalized vacancy skills
 * @returns {Array<{priority: string, text: string, tooltip?: string}>}
 */
export function buildRecommendations(ats, exp, flags, r, vacancySkills) {
  const recs = [];

  // Priority: ATS-critical
  const atsFailed = ats.checks.filter(c => !c.passed).sort((a, b) => b.weight - a.weight);
  for (const c of atsFailed.slice(0, 2)) {
    recs.push({ priority: 'critical', text: c.tip });
  }

  // Experience quality
  const expFailed = exp.checks.filter(c => !c.passed).sort((a, b) => b.weight - a.weight);
  for (const c of expFailed.slice(0, 2)) {
    recs.push({ priority: 'high', text: c.tip });
  }

  // Red flags
  for (const f of flags.slice(0, 2)) {
    recs.push({ priority: 'high', text: f });
  }

  // Vacancy skills missing from resume (v1.9.21.0, v1.9.22.0, v1.9.31.0)
  if (vacancySkills && vacancySkills.size > 0) {
    const resumeExplicit = normalizeSkillSet(r.skills || []);
    const resumeDerived = normalizeSkillSet(r.derivedSkills || []);
    const allResume = new Set([...resumeExplicit, ...resumeDerived]);
    const descText = (r.experience || []).map(e => e.description || '').join(' ').toLowerCase();
    const descNorm = descText.replace(/[-–—]/g, ' ').replace(/ё/g, 'е').replace(/\s+/g, ' ');

    // v1.9.31.0: Role-implied skills — skills self-evident from position title
    const roleImplied = getRoleImpliedSkills(r.title || '');

    const missing = [];
    const related = [];
    const implied = []; // v1.9.31.0: skills implied by role, shown separately

    for (const vs of vacancySkills) {
      if (resumeExplicit.has(vs)) continue;
      if (resumeDerived.has(vs)) continue;
      if (vs.length > 3 && descNorm.includes(vs)) continue;

      // v1.9.31.0: Skip if skill is implied by the position title
      if (roleImplied.has(vs)) {
        implied.push(vs);
        continue;
      }

      const synMatch = findSynonymMatch(vs, allResume);
      if (synMatch) {
        related.push(vs + ' ~ ' + synMatch);
      } else {
        missing.push(vs);
      }
    }

    if (missing.length > 0) {
      const sample = missing.slice(0, 5).map(s => '"' + s + '"').join(', ');
      const suffix = missing.length > 5 ? ' и ещё ' + (missing.length - 5) : '';
      recs.push({
        priority: 'high',
        text: missing.length + ' навыков вакансии нет в резюме: ' + sample + suffix + ' -- добавьте для лучшего мэтчинга',
        tooltip: missing.map(s => '"' + s + '"').join(', ')
      });
    }

    if (related.length > 0) {
      const sample = related.slice(0, 3).map(s => '"' + s + '"').join(', ');
      const suffix = related.length > 3 ? ' и ещё ' + (related.length - 3) : '';
      recs.push({
        priority: 'medium',
        text: 'Связанные навыки: ' + sample + suffix + ' -- упомяните явно для точного мэтчинга',
        tooltip: related.map(s => '"' + s + '"').join(', ')
      });
    }

    // v1.9.31.0: Skills implied by position (self-evident from role, low priority)
    if (implied.length > 0) {
      const sample = implied.slice(0, 5).map(s => '"' + s + '"').join(', ');
      const suffix = implied.length > 5 ? ' и ещё ' + (implied.length - 5) : '';
      recs.push({
        priority: 'low',
        text: implied.length + ' навыков подразумеваются должностью: ' + sample + suffix,
        tooltip: implied.map(s => '"' + s + '"').join(', ')
      });
    }
  }

  return recs;
}

/**
 * Normalize skill names: lowercase, trim, unify separators.
 * Same logic as match-scorer.normalizeSkillSet.
 */
function normalizeSkillSet(skills) {
  const set = new Set();
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    if (name) {
      set.add(
        name.toLowerCase().trim()
          .replace(/[-–—]/g, ' ')
          .replace(/ё/g, 'е')
          .replace(/\s+/g, ' ')
      );
    }
  }
  return set;
}
