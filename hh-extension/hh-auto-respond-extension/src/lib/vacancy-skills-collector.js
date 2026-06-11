/**
 * VACANCY SKILLS COLLECTOR
 * ========================
 * Shared utility for collecting and normalizing vacancy skills
 * from multiple sources: search results (panelState.vacancies)
 * and detail page (window.__hhVacDetail).
 *
 * Anti-monolith: extracted from resume-helpers-gap.js to avoid
 * duplication between gap analysis and quality recommendations.
 *
 * v1.9.21.0
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
 * Collect all vacancy skills from both sources:
 *   1. panelState.vacancies (search results) — uses tags, skills, keySkills, derivedSkills
 *   2. window.__hhVacDetail (detail page) — uses keySkills, derivedSkills
 *
 * Returns a Set of normalized skill names.
 *
 * @param {Array} vacancies — panelState.vacancies array
 * @returns {Set<string>}
 */
export function collectAllVacancySkills(vacancies) {
  const skills = new Set();

  // 1. Skills from search results (panelState.vacancies)
  if (Array.isArray(vacancies)) {
    for (const v of vacancies) {
      collectFromVacancyObject(v, skills);
    }
  }

  // 2. Skills from vacancy detail page (if user is on /vacancy/{id})
  const detail = window.__hhVacDetail;
  if (detail) {
    collectFromVacancyObject(detail, skills);
  }

  return skills;
}

/**
 * Extract skills from a single vacancy object into the target Set.
 * Handles multiple property names: tags, skills, keySkills, derivedSkills.
 *
 * @param {Object} v — vacancy object
 * @param {Set<string>} target — set to add normalized skills to
 */
function collectFromVacancyObject(v, target) {
  if (!v) return;

  const sources = [v.tags, v.skills, v.keySkills, v.derivedSkills];
  for (const arr of sources) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const name = typeof item === 'string' ? item : (item?.name || '');
      const norm = normalizeSkillName(name);
      if (norm && norm.length > 1) target.add(norm);
    }
  }
}

/**
 * Collect vacancy skills only from the detail page (window.__hhVacDetail).
 * Used when we only care about the current vacancy, not the search list.
 *
 * @returns {Set<string>}
 */
export function collectDetailVacancySkills() {
  const skills = new Set();
  const detail = window.__hhVacDetail;
  if (detail) {
    collectFromVacancyObject(detail, skills);
  }
  return skills;
}
