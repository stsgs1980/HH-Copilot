/**
 * MATCH SCORER: SKILLS (0–40)
 * ============================
 * Skill overlap between resume and vacancy.
 * Split from match-scorer.js for anti-monolith compliance.
 *
 * Weights:
 *   Explicit match  → 100% (skill declared in resume skills section)
 *   Derived match   → 70%  (skill inferred from experience descriptions)
 *   Synonym match   → 50%  (related skill from same synonym group)
 *   Implied match   → 40%  (skill self-evident from position title)
 *   Missing         → 0%
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

import { createLogger } from './anti-hallucination.js';
import { findSynonymMatch, SYNONYM_WEIGHT } from './skill-synonyms.js';
import { getRoleImpliedSkills, IMPLIED_WEIGHT } from './role-implied-skills.js';

const skillLog = createLogger('Scorer:Skills');

/**
 * Score skill overlap between resume and vacancy.
 * @returns {{ score: number, matching: string[], missing: string[], extra: string[], derivedMatch: string[], synonymMatch: string[], impliedMatch: string[] }}
 */
export function scoreSkills(resume, vacancy) {
  const resumeSkills = normalizeSkillSet(resume.skills || []);
  const derivedSkills = normalizeSkillSet(resume.derivedSkills || []);

  // v1.9.32.0: Only use keySkills (employer-listed). Never fall back to
  // vacancy.skills (search card tags — too noisy, 5-10 random pills per card).
  // derivedSkills used only when keySkills is empty.
  let vacancySkillsRaw = vacancy.keySkills || [];
  if (vacancySkillsRaw.length === 0 && vacancy.derivedSkills && vacancy.derivedSkills.length > 0) {
    skillLog.info('No vacancy keySkills — using derivedSkills (' + vacancy.derivedSkills.length + ')');
    vacancySkillsRaw = vacancy.derivedSkills;
  }
  const vacancySkills = normalizeSkillSet(vacancySkillsRaw);

  // Merge explicit + derived skills (derived at lower weight)
  const allResumeSkills = new Set([...resumeSkills, ...derivedSkills]);

  if (vacancySkills.size === 0) {
    // v1.9.19.0: Reduced neutral fallback from 20→10 (20 was too generous for "no data")
    return { score: 10, matching: [], missing: [], extra: [], derivedMatch: [], synonymMatch: [], impliedMatch: [] };
  }

  const matching = [];      // explicit skill match
  const derivedMatch = [];  // derived skill match
  const synonymMatch = [];  // synonym group match (v1.9.22.0)
  const impliedMatch = [];  // role-implied match (v1.9.31.0)
  const missing = [];

  // v1.9.31.0: Role-implied skills from position title
  const roleImplied = getRoleImpliedSkills(resume.title || '');

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
        synonymMatch.push(skill + ' ~ ' + synMatch);
      } else if (roleImplied.has(skill)) {
        // v1.9.31.0: Role-implied — skill self-evident from position title
        impliedMatch.push(skill);
      } else {
        missing.push(skill);
      }
    }
  }

  const extra = [];
  for (const skill of allResumeSkills) {
    if (!vacancySkills.has(skill)) extra.push(skill);
  }

  // Score: explicit 100%, derived 70%, synonyms 50%, implied 40%
  const explicitWeight = 1.0;
  const derivedWeight = 0.7;
  const effectiveMatches = matching.length * explicitWeight +
    derivedMatch.length * derivedWeight +
    synonymMatch.length * SYNONYM_WEIGHT +
    impliedMatch.length * IMPLIED_WEIGHT;
  const ratio = vacancySkills.size > 0 ? effectiveMatches / vacancySkills.size : 0;
  const score = Math.min(40, Math.round(ratio * 40));

  skillLog.info('explicit=' + matching.length + ' derived=' + derivedMatch.length +
    ' synonym=' + synonymMatch.length + ' implied=' + impliedMatch.length +
    ' missing=' + missing.length + ' → ' + score + '/40');

  return { score, matching, missing, extra, derivedMatch, synonymMatch, impliedMatch };
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
export function normalizeSkillSet(skills) {
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
