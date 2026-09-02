/**
 * ROLE-IMPLIED SKILLS
 * ====================
 * Skills automatically implied by job position title.
 * Based on ESCO essential/optional concept adapted for hh.ru Russian job market.
 *
 * When a person holds position "Руководитель отделов продаж",
 * skills like "руководство коллективом", "управление проектами"
 * are self-evident from the title and should NOT be shown as "missing".
 *
 * Research: docs/research/01-role-implied-skills.md
 * v1.9.31.0
 */

import { ROLE_SKILL_MAP } from "./role-implied-skills-data.js";

// Re-export for backward compatibility
export { ROLE_SKILL_MAP };

// ===============================================
// LOOKUP ENGINE
// ===============================================

/**
 * Normalize a string for comparison.
 * Same rules as match-scorer.normalizeSkillSet.
 */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[-\u2013\u2014]/g, " ")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

/**
 * Get role-implied skills for a given position title.
 *
 * Returns a Set of normalized skill names that are self-evident
 * from the position title and should NOT be shown as "missing".
 *
 * @param {string} title -- Position title (e.g. "Руководитель отделов продаж")
 * @returns {Set<string>} -- Set of normalized implied skill names
 */
export function getRoleImpliedSkills(title) {
  const result = new Set();
  if (!title) return result;

  const normalizedTitle = normalize(title);

  for (const group of ROLE_SKILL_MAP) {
    // Check if any trigger matches the title
    const triggered = group.triggers.some((trigger) => normalizedTitle.includes(normalize(trigger)));
    if (!triggered) continue;

    // Check if any exclude word is present
    const excluded = group.exclude.some((exc) => normalizedTitle.includes(normalize(exc)));
    if (excluded) continue;

    // Add all implied skills
    for (const skill of group.implied) {
      result.add(normalize(skill));
    }
  }

  return result;
}

/**
 * Weight for role-implied skill matches.
 * Between synonym (50%) and missing (0%).
 * Implied = position self-evidently provides this skill,
 * but we can't be 100% certain -> partial credit.
 */
export const IMPLIED_WEIGHT = 0.4;

/**
 * Check if a skill is implied by the given position title.
 *
 * @param {string} skill -- Normalized skill name
 * @param {string} title -- Position title
 * @returns {boolean}
 */
export function isSkillImpliedByRole(skill, title) {
  return getRoleImpliedSkills(title).has(normalize(skill));
}
