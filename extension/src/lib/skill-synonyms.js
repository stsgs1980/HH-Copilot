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
 * v1.9.69.0: RF-SYN fix -- prefix stripping + OR-semantic stem fallback
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
let _allGroupMembers = null; // flat Set of every normalized group member (for stem fallback)

function buildSynonymIndex() {
  const index = new Map();
  const allMembers = new Set();
  for (const group of SYNONYM_GROUPS) {
    // Normalize all members
    const normalizedGroup = group.map(s => normalize(s));
    for (const skill of normalizedGroup) {
      allMembers.add(skill);
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
  _allGroupMembers = allMembers;
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

// ===============================================
// PREFIX STRIPPING (RF-SYN fix, v1.9.69.0)
// ===============================================

/**
 * Service prefixes that hh.ru adds to keySkills but are not part of the
 * actual skill name. E.g. "Навыки переговоров" -> "переговоров".
 * Stripped BEFORE synonym index lookup.
 *
 * Kept minimal to avoid false positives. Only prefixes that carry zero
 * semantic content and merely restate "this is a skill".
 */
const SKILL_PREFIXES = [
  'навыки ',
  'навык ',
  'умение ',
  'знание ',
];

/**
 * Strip a known service prefix from a normalized skill name.
 * Returns the stripped string, or the original if no prefix matches.
 */
function stripSkillPrefix(normalized) {
  for (const prefix of SKILL_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      const stripped = normalized.slice(prefix.length).trim();
      if (stripped.length > 0) return stripped;
    }
  }
  return normalized;
}

// ===============================================
// OR-SEMANTIC STEM FALLBACK (RF-SYN fix, v1.9.69.0)
// ===============================================

/** Minimum word length to include in stem comparison. Shorter = function word/preposition. */
const STEM_MIN_WORD = 4;

/** Number of leading characters to use as a crude stem. */
const STEM_LEN = 4;

/**
 * Extract content words (>= STEM_MIN_WORD chars) from a normalized skill name.
 * Filters out prepositions ("с", "и", "в", "на", "по", "для", "от", etc.).
 */
function contentWords(normalized) {
  return normalized
    .split(/\s+/)
    .filter(w => w.length >= STEM_MIN_WORD);
}

/**
 * Crude stem: first STEM_LEN lowercase characters.
 * Good enough for Russian skill-name inflection variants:
 *   "переговоров" -> "пере", "переговоры" -> "пере" (match)
 *   "возражений" -> "возр", "возражениями" -> "возр" (match)
 *   "отработка" -> "отра", "работа" -> "рабо" (no match -- correct)
 */
function crudeStem(word) {
  return word.toLowerCase().substring(0, STEM_LEN);
}

/**
 * OR-semantic stem match between two normalized skill names.
 * Returns true if ANY content word from skillA shares a stem with
 * ANY content word from skillB.
 *
 * Unlike mentionsSkillStem (AND semantics, designed for skill-vs-sentence),
 * this is designed for skill-vs-skill comparison where prepositions and
 * function words should be ignored.
 *
 * Examples:
 *   stemMatchSkills("переговоров", "переговоры") -> true ("пере" = "пере")
 *   stemMatchSkills("отработка возражений", "работа с возражениями") -> true ("возр" = "возр")
 *   stemMatchSkills("деловая коммуникация", "деловое общение") -> false (no shared stem)
 */
function stemMatchSkills(normA, normB) {
  const wordsA = contentWords(normA);
  const wordsB = contentWords(normB);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  for (const wa of wordsA) {
    const sa = crudeStem(wa);
    for (const wb of wordsB) {
      if (sa === crudeStem(wb)) return true;
    }
  }
  return false;
}

// ===============================================
// FIND SYNONYM MATCH (enhanced)
// ===============================================

/**
 * Check if skillA has a synonym match with any skill in the provided set.
 * Returns the matched synonym from the set, or null if no synonym match.
 *
 * Three-tier lookup (v1.9.69.0):
 *   1. Direct index lookup (exact match after normalize)
 *   2. Prefix-stripped lookup (strip "навыки ", "умение ", etc.)
 *   3. OR-semantic stem fallback against all known group members
 *
 * @param {string} skillA -- skill name to check (will be normalized)
 * @param {Set<string>} skillSet -- set of normalized skill names
 * @returns {string|null} -- the synonym found in skillSet, or null
 */
export function findSynonymMatch(skillA, skillSet) {
  if (!_synonymIndex) _synonymIndex = buildSynonymIndex();

  const normA = normalize(skillA);

  // Tier 1: direct index lookup
  const synonyms = _synonymIndex.get(normA);
  if (synonyms) {
    for (const syn of synonyms) {
      if (skillSet.has(syn)) return syn;
    }
  }

  // Tier 2: prefix-stripped lookup
  const stripped = stripSkillPrefix(normA);
  if (stripped !== normA) {
    const strippedSynonyms = _synonymIndex.get(stripped);
    if (strippedSynonyms) {
      for (const syn of strippedSynonyms) {
        if (skillSet.has(syn)) return syn;
      }
    }
  }

  // Tier 3: OR-semantic stem fallback
  // Check every resume skill in skillSet against every known group member.
  // Only triggers when the resume skill IS a group member (has synonyms).
  if (!_allGroupMembers) buildSynonymIndex();
  for (const resumeSkill of skillSet) {
    if (!_allGroupMembers.has(resumeSkill)) continue;
    const groupSynonyms = _synonymIndex.get(resumeSkill);
    if (!groupSynonyms) continue;
    for (const member of groupSynonyms) {
      // member is a synonym of the resume skill; check if skillA stems-match it
      if (stemMatchSkills(normA, member)) return resumeSkill;
    }
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
