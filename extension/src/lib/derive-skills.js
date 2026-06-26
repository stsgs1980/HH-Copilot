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
 *
 * v1.9.70.0: RF-1 fix -- sentence-level negation/context filter
 */

import { SKILL_PATTERNS } from './skill-dictionary.js';
import { createLogger } from './anti-hallucination.js';

const deriveLog = createLogger('DeriveSkills');

// ===============================================
// NEGATION / CONTEXT FILTER (RF-1 fix, v1.9.70.0)
// ===============================================

/**
 * Sentence-level patterns that indicate the candidate does NOT possess
 * a skill mentioned in the same sentence. Any sentence matching one of
 * these is excluded from skill derivation.
 *
 * Categories:
 *   A. Explicit negation of action: "не использовал CRM"
 *   B. Abandonment: "пробовал 1С, бросил"
 *   C. Company context: "компания ищет React"
 *   D. Access denied: "доступа не имел"
 *   E. No practice: "на практике не применял"
 */
const NEGATION_MARKERS = [
  // A. Explicit negation -- candidate says they DON'T do/have X
  // NOTE: \b does NOT work with Cyrillic (JS treats non-ASCII as non-word).
  //       Use (?<!\p{L}) / (?!\p{L}) with 'u' flag for Unicode-aware boundaries.
  /(?<!\p{L})не\s+(?:использовал|применял|имел|знал|работал|владел|умел|использую|применяю|работаю|владею|кодил)(?!\p{L})/iu,
  /(?<!\p{L})без\s+(?:опыта|знания|практики)(?!\p{L})/iu,

  // B. Abandonment / past-tense attempts that didn't stick
  /(?<!\p{L})(?:бросил|забросил|оставил|не продолжил|не стал)(?!\p{L})/iu,

  // C. Company context -- the COMPANY seeks the skill, not the candidate
  /(?<!\p{L})компания\s+(?:ищет|требует|нанимает|нужен|нужны)(?!\p{L})/iu,
  /(?<!\p{L})(?:ищем|ищу|требуются|нужны)\s+(?:разработчик|специалист|менеджер|инженер)(?!\p{L})/iu,

  // D. Access denied
  /(?<!\p{L})(?:доступ[ау]?\s*не\s+(?:имел|был|получил)|не\s+имел\s+доступ)(?!\p{L})/iu,

  // E. No practical application
  /(?<!\p{L})(?:на\s+практике\s+не|не\s+применял\s+на\s+практике)(?!\p{L})/iu,
  /(?<!\p{L})(?:только\s+(?:читал|слышал|знал)\s+про)(?!\p{L})/iu,
];

/**
 * Split text into sentences and filter out those with negation/context markers.
 * Returns a corpus string of only "safe" sentences.
 *
 * @param {string} corpus -- full text corpus
 * @returns {string} -- filtered corpus (safe sentences only)
 */
function buildSafeCorpus(corpus) {
  // Split on sentence terminators and newlines
  const sentences = corpus.split(/(?<=[.!?])\s+|\n/);
  const safe = sentences.filter(s => {
    const trimmed = s.trim();
    if (trimmed.length < 8) return true; // truly trivial fragments ("CRM.", "B2B.") are safe
    return !NEGATION_MARKERS.some(re => re.test(trimmed));
  });
  return safe.join('\n');
}

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

  // RF-1 fix: filter out negated/contextual sentences before matching
  const safeCorpus = buildSafeCorpus(corpus);

  // Normalise existing skills for dedup
  const existingSkills = new Set(
    (resume.skills || []).map(s => s.toLowerCase().trim().replace(/\s+/g, ' '))
  );

  const derived = [];

  for (const entry of SKILL_PATTERNS) {
    // Skip if already in explicit skills
    if (existingSkills.has(entry.skill.toLowerCase().trim())) continue;

    // Check each pattern against SAFE corpus only
    for (const pattern of entry.patterns) {
      if (pattern.test(safeCorpus)) {
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

  const corpus = textParts.join('\n');
  if (!corpus) return [];

  // RF-1 fix: same negation filter for reverse derivation
  const safeCorpus = buildSafeCorpus(corpus).toLowerCase();

  const existingSkills = new Set(
    (resume.skills || []).map(s => s.toLowerCase().trim())
  );

  const matched = [];

  for (const skill of vacancySkillNames) {
    const normalized = skill.toLowerCase().trim();
    // Already in explicit skills -- skip
    if (existingSkills.has(normalized)) continue;

    // Check if the skill name itself appears in SAFE text
    if (safeCorpus.includes(normalized)) {
      matched.push(skill);
      continue;
    }

    // Check if any dictionary pattern for this skill matches
    for (const entry of SKILL_PATTERNS) {
      if (entry.skill.toLowerCase() === normalized) {
        for (const pattern of entry.patterns) {
          if (pattern.test(safeCorpus)) {
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