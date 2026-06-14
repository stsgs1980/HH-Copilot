/**
 * LIB: DERIVE SKILLS FROM EXPERIENCE
 * ====================================
 * Scans resume experience descriptions and title for skill keywords
 * using the SKILL_PATTERNS dictionary. Derived skills are added to
 * resume.derivedSkills[] -- they do NOT replace resume.skills[].
 *
 * Also scans vacancy keySkills that are NOT in resume.skills and tries
 * to match them against experience text (reverse derivation).
 *
 * Flow:
 *   parseSkills()       -> resume.skills[]     (explicit tags from page)
 *   deriveSkillsFromExperience() -> resume.derivedSkills[] (inferred from text)
 *   scoreSkills()       -> merges both for matching
 */

import { SKILL_PATTERNS } from './skill-dictionary.js';
import { createLogger } from './anti-hallucination.js';

const deriveLog = createLogger('DeriveSkills');

/**
 * Derive skills from resume experience descriptions and title.
 * Modifies resume object in-place: adds resume.derivedSkills[].
 *
 * @param {Object} resume -- parsed resume object
 * @returns {string[]} Array of derived skill names
 */
export function deriveSkillsFromExperience(resume) {
  if (!resume) return [];

  // Build the text corpus from experience descriptions + position titles
  const textParts = [];

  // Title
  if (resume.title) textParts.push(resume.title);

  // Experience descriptions
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.description) textParts.push(exp.description);
      if (exp.position) textParts.push(exp.position);
      // Some experience entries have additional text
      if (exp.duties) textParts.push(exp.duties);
      if (exp.achievements) textParts.push(exp.achievements);
    }
  }

  // Additional info
  if (resume.additionalInfo) textParts.push(resume.additionalInfo);

  // About me
  if (resume.about) textParts.push(resume.about);

  const corpus = textParts.join('\n');

  if (!corpus || corpus.length < 10) {
    deriveLog.info('No text corpus for skill derivation');
    resume.derivedSkills = [];
    return [];
  }

  // Normalise existing skills for dedup
  const existingSkills = new Set(
    (resume.skills || []).map(s => s.toLowerCase().trim().replace(/\s+/g, ' '))
  );

  const derived = [];

  for (const entry of SKILL_PATTERNS) {
    // Skip if already in explicit skills
    if (existingSkills.has(entry.skill.toLowerCase().trim())) continue;

    // Check each pattern
    for (const pattern of entry.patterns) {
      if (pattern.test(corpus)) {
        derived.push(entry.skill);
        break; // one match is enough per skill
      }
    }
  }

  resume.derivedSkills = derived;

  deriveLog.info('Derived ' + derived.length + ' skills from experience text (' +
    corpus.length + ' chars scanned)');
  if (derived.length > 0) {
    deriveLog.info('Derived skills: ' + derived.join(', '));
  }

  return derived;
}

/**
 * Try to match specific vacancy skills against experience text.
 * Useful for "reverse derivation": vacancy wants "управление командой",
 * we check if experience text contains relevant keywords.
 *
 * @param {Object} resume -- parsed resume object
 * @param {string[]} vacancySkillNames -- skills from vacancy
 * @returns {string[]} Vacancy skills that appear to be present in experience
 */
export function matchVacancySkillsToExperience(resume, vacancySkillNames) {
  if (!resume || !Array.isArray(vacancySkillNames)) return [];

  const textParts = [];

  if (resume.title) textParts.push(resume.title);
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.description) textParts.push(exp.description);
      if (exp.position) textParts.push(exp.position);
    }
  }
  if (resume.additionalInfo) textParts.push(resume.additionalInfo);

  const corpus = textParts.join('\n').toLowerCase();
  if (!corpus) return [];

  const existingSkills = new Set(
    (resume.skills || []).map(s => s.toLowerCase().trim())
  );

  const matched = [];

  for (const skill of vacancySkillNames) {
    const normalized = skill.toLowerCase().trim();
    // Already in explicit skills -- skip
    if (existingSkills.has(normalized)) continue;

    // Check if the skill name itself appears in text
    if (corpus.includes(normalized)) {
      matched.push(skill);
      continue;
    }

    // Check if any dictionary pattern for this skill matches
    for (const entry of SKILL_PATTERNS) {
      if (entry.skill.toLowerCase() === normalized) {
        for (const pattern of entry.patterns) {
          if (pattern.test(corpus)) {
            matched.push(skill);
            break;
          }
        }
        break;
      }
    }
  }

  return matched;
}
