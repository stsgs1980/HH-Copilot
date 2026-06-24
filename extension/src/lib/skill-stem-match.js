/**
 * LIB: SKILL STEM MATCHING (extracted from cover-letter-evidence.js, v1.9.56.0)
 * =================================================================
 * Stem/partial matching of a skill name against a sentence. Used as the 4th-tier
 * fallback in evidence mapping (exact > position > company > stem).
 *
 * Extracted to keep cover-letter-evidence.js under AHG Rule 12 (250 lines).
 *
 * Anti-hallucination hardening (v1.9.56.0):
 *   - Gap 1: short stems (<=6 chars) require exact word OR word + inflection
 *     suffix. Blocks "react" matching "Reactive".
 *   - Gap 2: short skill tokens (< MIN_STEM_LEN) must be present EXACTLY.
 *     Blocks "C++ разработка" matching when "C++" is absent.
 *   - Gap 5: sentence coerced to String -- never throws on non-string input.
 */

export const MIN_STEM_LEN = 4; // words shorter than this require exact match

/** Escape a string for safe insertion into a RegExp. */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word boundary char class (Unicode-aware: Latin + Cyrillic + digits). */
const BOUND = '[^a-zа-яё0-9]';

// Suffix list used by Gap 1 hardening: when a short skill stem (<=6 chars)
// matches the prefix of a longer sentence word, we only accept it if the
// remainder of that word is a known inflection. This blocks false positives
// like "react" matching "Reactive" (remainder "ive" is not a suffix) while
// still allowing legitimate inflections ("react"+"ом", "react"+"s").
const SHORT_STEM_SUFFIXES = [
  // Russian case endings (nominal + adjectival)
  'а', 'я', 'у', 'ю', 'ом', 'ой', 'ей', 'е', 'ы', 'и', 'ам', 'ям',
  'ах', 'ях', 'ов', 'ев', 'ами', 'ями', 'ь', 'ого', 'его', 'ому', 'ему',
  // Common English inflections
  's', 'es', 'ed', 'ing', 'er', 'or', 'ly', 'tion',
];

/**
 * Gap 1 hardening: does the sentence contain the short skill as an exact word,
 * or as that word followed by a known inflection suffix?
 * @param {string} sentence - already lowercased
 * @param {string} word - skill word (lowercased)
 * @returns {boolean}
 */
function shortStemMatches(sentence, word) {
  const escaped = escapeRegex(word);
  for (const suffix of SHORT_STEM_SUFFIXES) {
    const re = new RegExp(
      '(^|' + BOUND + ')' + escaped + escapeRegex(suffix) + '(' + BOUND + '|$)',
      'i'
    );
    if (re.test(sentence)) return true;
  }
  // Exact standalone word (no suffix)
  const exactRe = new RegExp('(^|' + BOUND + ')' + escaped + '(' + BOUND + '|$)', 'i');
  return exactRe.test(sentence);
}

/**
 * Try to match a skill against a sentence by word-stem prefix.
 *
 * Strategy (v1.9.56.0 hardened):
 *   1. Tokenize skill into words (split on whitespace/dash).
 *   2. SHORT tokens (< MIN_STEM_LEN) MUST be present EXACTLY (Gap 2).
 *   3. LONG tokens: derive a stem (first 4-6 chars).
 *      - If skill word <= 6 chars: require exact word OR word + suffix (Gap 1).
 *      - If skill word > 6 chars: plain prefix match.
 *   4. Return true only if ALL tokens satisfy their tier (AND semantics).
 *
 * Examples:
 *   mentionsSkillStem('Управлял командой продаж.', 'Управление продажами') -> true
 *   mentionsSkillStem('Reactive programming.', 'react')                    -> false (Gap 1)
 *   mentionsSkillStem('Руководил разработкой.', 'C++ разработка')          -> false (Gap 2)
 *
 * @param {string} sentence
 * @param {string} skill
 * @returns {boolean}
 */
export function mentionsSkillStem(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = String(sentence).toLowerCase(); // Gap 5: coerce, never throw
  const allSkillWords = String(skill)
    .toLowerCase()
    .split(/[\s-]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  if (allSkillWords.length === 0) return false;

  const shortWords = allSkillWords.filter(w => w.length < MIN_STEM_LEN);
  const longWords = allSkillWords.filter(w => w.length >= MIN_STEM_LEN);

  // Gap 2: every short token must appear EXACTLY (case-insensitive, word-bounded).
  for (const sw of shortWords) {
    const re = new RegExp('(^|' + BOUND + ')' + escapeRegex(sw) + '(' + BOUND + '|$)', 'i');
    if (!re.test(s)) return false;
  }

  // If the skill had ONLY short tokens, that is the whole check.
  if (longWords.length === 0) return shortWords.length > 0;

  for (const lw of longWords) {
    if (lw.length <= 6) {
      // Short stem: strict suffix-aware check (Gap 1).
      if (!shortStemMatches(s, lw)) return false;
    } else {
      // Long stem: prefix match (first 6 chars).
      const stem = lw.substring(0, 6);
      const re = new RegExp('(^|' + BOUND + ')' + escapeRegex(stem), 'i');
      if (!re.test(s)) return false;
    }
  }
  return true;
}

/** Exported for tests. */
export const _internal = { shortStemMatches, SHORT_STEM_SUFFIXES };
