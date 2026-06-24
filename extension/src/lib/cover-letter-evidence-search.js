/**
 * LIB: COMPETENCY EVIDENCE SEARCH (extracted v1.9.56.0)
 * ========================================================
 * 4-tier search for concrete evidence of a single competency inside the
 * resume's experience entries. Extracted from cover-letter-evidence.js to
 * satisfy AHG Rule 12 (<250 lines).
 *
 * Tiers (first match wins, searched most-recent experience first):
 *   1. description sentences (exact word match)
 *   2. position title (exact)
 *   3. company name (exact)
 *   4. description sentences (stem/partial match -- weakest, fieldType='stem')
 *
 * Returns a `found` record or null.
 */

import { mentionsSkillStem } from './skill-stem-match.js';
import { splitSentences } from './cover-letter-evidence-fallback.js';

/**
 * Case-insensitive whole-word substring check.
 * @param {string} sentence
 * @param {string} skill
 * @returns {boolean}
 */
function mentionsSkill(sentence, skill) {
  if (!sentence || !skill) return false;
  const s = sentence.toLowerCase();
  const k = String(skill).toLowerCase().trim();
  const re = new RegExp('(^|[^a-zа-яё0-9])'
    + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '([^a-zа-яё0-9]|$)', 'i');
  return re.test(s);
}

/**
 * Build a `found` record for one experience entry + tier.
 */
function makeFound(i, exp, sentence, fieldType, entryDescription) {
  return {
    sentence,
    index: i,
    company: exp.company || '',
    position: exp.position || '',
    period: exp.period || '',
    entryDescription,
    fieldType,
  };
}

/**
 * Search experience entries (most-recent first) for evidence of `comp`.
 * @param {string} comp - competency / skill name
 * @param {Array} experience - resume.experience array
 * @returns {Object|null} found record, or null if nothing matched
 */
export function findCompetencyEvidence(comp, experience) {
  if (!comp || !Array.isArray(experience)) return null;

  for (let i = experience.length - 1; i >= 0; i--) {
    const exp = experience[i];
    if (!exp) continue;
    let found = null;

    // 1. Primary: scan description sentences (exact).
    if (exp.description) {
      for (const sentence of splitSentences(exp.description)) {
        if (mentionsSkill(sentence, comp)) {
          found = makeFound(i, exp, sentence, 'description', exp.description);
          break;
        }
      }
    }

    // 2. Secondary: scan position title (exact).
    if (!found && exp.position && mentionsSkill(exp.position, comp)) {
      found = makeFound(i, exp, exp.position, 'position', exp.position);
    }

    // 3. Tertiary: scan company name (exact).
    if (!found && exp.company && mentionsSkill(exp.company, comp)) {
      found = makeFound(i, exp, exp.company, 'company', exp.company);
    }

    // 4. Quaternary (v1.9.55.0): partial/stem match on description.
    //    fieldType='stem' -> confidence capped at 'low' (weaker evidence).
    if (!found && exp.description) {
      for (const sentence of splitSentences(exp.description)) {
        if (mentionsSkillStem(sentence, comp)) {
          found = makeFound(i, exp, sentence, 'stem', exp.description);
          break;
        }
      }
    }

    if (found) return found;
  }
  return null;
}

/** Exported for tests. */
export const _internal = { mentionsSkill };
