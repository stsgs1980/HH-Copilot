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
 *   Missing         → 0%
 *
 * v1.9.23.0: extracted from match-scorer.js
 */

import { createLogger } from './anti-hallucination.js';
import { findSynonymMatch, SYNONYM_WEIGHT } from './skill-synonyms.js';

const skillLog = createLogger('Scorer:Skills');

/**
 * Score skill overlap between resume and vacancy.
 * @returns {{ score: number, matching: string[], missing: string[], extra: string[], derivedMatch: string[], synonymMatch: string[] }}
 */
export function scoreSkills(resume, vacancy) {
  const resumeSkills = normalizeSkillSet(resume.skills || []);
  const derivedSkills = normalizeSkillSet(resume.derivedSkills || []);

  // v1.9.19.0: Use vacancy.derivedSkills when no explicit keySkills
  let vacancySkillsRaw = vacancy.keySkills || vacancy.skills || [];
  if (vacancySkillsRaw.length === 0 && vacancy.derivedSkills && vacancy.derivedSkills.length > 0) {
    skillLog.info('No vacancy keySkills — using derivedSkills (' + vacancy.derivedSkills.length + ')');
    vacancySkillsRaw = vacancy.derivedSkills;
  }
  const vacancySkills = normalizeSkillSet(vacancySkillsRaw);

  // Merge explicit + derived skills (derived at lower weight)
  const allResumeSkills = new Set([...resumeSkills, ...derivedSkills]);

  if (vacancySkills.size === 0) {
    // v1.9.19.0: Reduced neutral fallback from 20→10 (20 was too generous for "no data")
    return { score: 10, matching: [], missing: [], extra: [], derivedMatch: [], synonymMatch: [] };
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
  const explicitWeight = 1.0;
  const derivedWeight = 0.7;
  const effectiveMatches = matching.length * explicitWeight +
    derivedMatch.length * derivedWeight +
    synonymMatch.length * SYNONYM_WEIGHT;
  const ratio = vacancySkills.size > 0 ? effectiveMatches / vacancySkills.size : 0;
  const score = Math.min(40, Math.round(ratio * 40));

  skillLog.info('explicit=' + matching.length + ' derived=' + derivedMatch.length +
    ' synonym=' + synonymMatch.length + ' missing=' + missing.length + ' → ' + score + '/40');

  return { score, matching, missing, extra, derivedMatch, synonymMatch };
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
