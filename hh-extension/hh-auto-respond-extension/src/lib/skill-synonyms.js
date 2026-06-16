/**
 * LIB: SKILL SYNONYMS (orchestrator)
 * ===================================
 * Synonym groups for related skills.
 * When a vacancy requires skill A and the resume has skill B from the same
 * group, they count as a partial match (synonym match) instead of "missing".
 *
 * This solves the problem: "переговоры" should partially match
 * "работа с возражениями" because objection handling IS part of negotiations.
 *
 * Weight: synonym matches count at 50% (between derived 70% and missing 0%).
 * Rationale: synonyms indicate related competence, not exact skill.
 *
 * Data was split into 3 category files (AHG Rule 12 anti-monolith):
 *   - skill-synonyms-data-sales.js           (sales + management)
 *   - skill-synonyms-data-marketing-finance.js (marketing + finance)
 *   - skill-synonyms-data-product-hr-it.js   (product + HR + logistics + IT)
 *
 * v1.9.22.0
 */

import { SALES_MANAGEMENT_SYNONYM_GROUPS } from './skill-synonyms-data-sales.js';
import { MARKETING_FINANCE_SYNONYM_GROUPS } from './skill-synonyms-data-marketing-finance.js';
import { PRODUCT_HR_IT_SYNONYM_GROUPS } from './skill-synonyms-data-product-hr-it.js';

const SYNONYM_GROUPS = [
  ...SALES_MANAGEMENT_SYNONYM_GROUPS,
  ...MARKETING_FINANCE_SYNONYM_GROUPS,
  ...PRODUCT_HR_IT_SYNONYM_GROUPS,
];

// ===============================================
// LOOKUP ENGINE
// ===============================================

/**
 * Build a reverse index: normalized skill name -> Set of synonym group members.
 * Built once on first call, then cached.
 */
let _synonymIndex = null;

function buildSynonymIndex() {
  const index = new Map();
  for (const group of SYNONYM_GROUPS) {
    // Normalize all members
    const normalizedGroup = group.map(s => normalize(s));
    for (const skill of normalizedGroup) {
      if (!index.has(skill)) {
        index.set(skill, new Set());
      }
      for (const other of normalizedGroup) {
        if (other !== skill) {
          index.get(skill).add(other);
        }
      }
    }
  }
  return index;
}

/**
 * Normalize a skill name for lookup.
 * Same rules as match-scorer.normalizeSkillSet.
 */
function normalize(name) {
  return (name || '')
    .toLowerCase().trim()
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

/**
 * Check if skillA has a synonym match with any skill in the provided set.
 * Returns the matched synonym from the set, or null if no synonym match.
 *
 * @param {string} skillA -- normalized skill name to check
 * @param {Set<string>} skillSet -- set of normalized skill names
 * @returns {string|null} -- the synonym found in skillSet, or null
 */
export function findSynonymMatch(skillA, skillSet) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();

  const synonyms = _synonymIndex.get(normalize(skillA));
  if (!synonyms) return null;

  for (const syn of synonyms) {
    if (skillSet.has(syn)) return syn;
  }
  return null;
}

/**
 * Get all synonyms for a skill (normalized).
 * Returns an empty Set if the skill has no synonym group.
 *
 * @param {string} skill -- skill name (will be normalized)
 * @returns {Set<string>}
 */
export function getSynonyms(skill) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
  return _synonymIndex.get(normalize(skill)) || new Set();
}

/**
 * Check if two normalized skills are in the same synonym group.
 *
 * @param {string} skillA -- normalized skill name
 * @param {string} skillB -- normalized skill name
 * @returns {boolean}
 */
export function areSynonyms(skillA, skillB) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();
  const synonyms = _synonymIndex.get(normalize(skillA));
  return synonyms ? synonyms.has(normalize(skillB)) : false;
}

/**
 * Weight for synonym matches (between derived 0.7 and missing 0).
 * Synonym = related but not identical skill.
 */
export const SYNONYM_WEIGHT = 0.5;
