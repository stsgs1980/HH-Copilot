/**
 * VACANCY SKILLS COLLECTOR
 * ========================
 * Shared utility for collecting and normalizing vacancy skills
 * from the detail page (window.__hhVacDetail).
 *
 * Anti-monolith: extracted from resume-helpers-gap.js to avoid
 * duplication between gap analysis and quality recommendations.
 *
 * v1.9.21.0: Initial extraction
 * v1.9.32.0: Critical fix — only use keySkills (employer-listed).
 *   Previously merged tags + skills + keySkills + derivedSkills from
 *   ALL search results, producing 70-100+ irrelevant "missing" skills
 *   (e.g., "выкладка товаров" for a marketing manager resume).
 *   Now: keySkills primary, derivedSkills fallback only when empty.
 */

/**
 * Normalize a single skill name: lowercase, trim, unify separators.
 * Same logic as match-scorer.normalizeSkillSet.
 * @param {string} name
 * @returns {string}
 */
function normalizeSkillName(name) {
  return (name || '')
    .toLowerCase().trim()
    .replace(/[-–—]/g, ' ')   // hyphens/dashes → space ("B2B-Продажи" → "b2b продажи")
    .replace(/ё/g, 'е')       // ё → е
    .replace(/\s+/g, ' ');    // collapse multiple spaces
}

/**
 * Add items from an array into a normalized Set.
 * @param {Array} arr — raw skill array (strings or {name} objects)
 * @param {Set<string>} target — set to add normalized names to
 */
function addNormalized(arr, target) {
  if (!Array.isArray(arr)) return;
  for (const item of arr) {
    const name = typeof item === 'string' ? item : (item?.name || '');
    const norm = normalizeSkillName(name);
    if (norm && norm.length > 1) target.add(norm);
  }
}

/**
 * Collect vacancy skills only from the detail page (window.__hhVacDetail).
 *
 * Strategy (v1.9.32.0):
 *   1. keySkills — official employer-listed skills from vacancy page
 *      (parsed from [data-qa="skills-element"]). These are the REAL
 *      requirements — typically 5-15 items.
 *   2. derivedSkills — fallback ONLY when keySkills is empty.
 *      These are inferred from description text via SKILL_PATTERNS.
 *      Can be noisy (20-30 items) but better than nothing.
 *   3. tags / skills — NEVER used. These come from search result
 *      cards and contain bloko-tag pills from ALL vacancies in the
 *      list, producing 70-100+ irrelevant skills.
 *
 * @returns {Set<string>} Normalized skill names
 */
export function collectDetailVacancySkills() {
  const detail = window.__hhVacDetail;
  if (!detail) return new Set();

  // Priority 1: keySkills (employer-listed, most reliable)
  const hasKeySkills = Array.isArray(detail.keySkills) && detail.keySkills.length > 0;
  if (hasKeySkills) {
    const skills = new Set();
    addNormalized(detail.keySkills, skills);
    return skills;
  }

  // Priority 2: derivedSkills (inferred from description — noisy but better than nothing)
  const hasDerived = Array.isArray(detail.derivedSkills) && detail.derivedSkills.length > 0;
  if (hasDerived) {
    const skills = new Set();
    addNormalized(detail.derivedSkills, skills);
    return skills;
  }

  return new Set();
}

/**
 * DEPRECATED (v1.9.32.0): Merging skills from all search results was the
 * root cause of nonsensical recommendations. Kept for backward compat
 * but should not be used for skill gap / quality recommendations.
 *
 * Collect all vacancy skills from both sources:
 *   1. panelState.vacancies (search results) — uses skills, keySkills
 *   2. window.__hhVacDetail (detail page) — uses keySkills, derivedSkills
 *
 * @param {Array} vacancies — panelState.vacancies array
 * @returns {Set<string>}
 */
export function collectAllVacancySkills(vacancies) {
  const skills = new Set();

  // Detail page: keySkills only (see collectDetailVacancySkills for rationale)
  const detail = window.__hhVacDetail;
  if (detail) {
    const hasKeySkills = Array.isArray(detail.keySkills) && detail.keySkills.length > 0;
    if (hasKeySkills) {
      addNormalized(detail.keySkills, skills);
    } else if (Array.isArray(detail.derivedSkills) && detail.derivedSkills.length > 0) {
      addNormalized(detail.derivedSkills, skills);
    }
  }

  // Search results: only keySkills if present, skip tags/skills
  if (Array.isArray(vacancies)) {
    for (const v of vacancies) {
      if (Array.isArray(v.keySkills) && v.keySkills.length > 0) {
        addNormalized(v.keySkills, skills);
      }
    }
  }

  return skills;
}
