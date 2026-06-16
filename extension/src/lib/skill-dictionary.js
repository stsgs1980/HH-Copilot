/**
 * LIB: SKILL DICTIONARY (aggregator)
 * ===================================
 * ANTI-MONOLITH (Rule 12): This file was 477 lines. Split into 3 domain
 * modules; this file is now a thin aggregator that preserves the public API:
 *   - SKILL_PATTERNS (array, same order as before)
 *   - getAllSkillNames()
 *   - countPatterns()
 *
 * Domain modules:
 *   - skill-dictionary-management-sales.js
 *   - skill-dictionary-marketing-finance-it.js
 *   - skill-dictionary-product-hr-soft.js
 *
 * Used by derive-skills.js to infer skills from experience descriptions.
 * v1.9.42.0
 */

import { MANAGEMENT_SKILLS, SALES_SKILLS } from './skill-dictionary-management-sales.js';
import { MARKETING_SKILLS, FINANCE_SKILLS, IT_SKILLS } from './skill-dictionary-marketing-finance-it.js';
import { PRODUCT_SKILLS, HR_SKILLS, LOGISTICS_SKILLS, SOFT_SKILLS } from './skill-dictionary-product-hr-soft.js';

/**
 * Full skill pattern dictionary.
 * Order is preserved: management -> sales -> marketing -> finance ->
 * IT -> product -> HR -> logistics -> soft skills.
 */
export const SKILL_PATTERNS = [
  ...MANAGEMENT_SKILLS,
  ...SALES_SKILLS,
  ...MARKETING_SKILLS,
  ...FINANCE_SKILLS,
  ...IT_SKILLS,
  ...PRODUCT_SKILLS,
  ...HR_SKILLS,
  ...LOGISTICS_SKILLS,
  ...SOFT_SKILLS,
];

/**
 * Get all skill names from the dictionary.
 * Useful for debugging and testing.
 */
export function getAllSkillNames() {
  return SKILL_PATTERNS.map(s => s.skill);
}

/**
 * Count total patterns across all entries.
 */
export function countPatterns() {
  return SKILL_PATTERNS.reduce((sum, s) => sum + s.patterns.length, 0);
}
