/**
 * LIB: COVER LETTER PLACEHOLDER EXTRACTION
 * =========================================
 * Extracts placeholder values (position, company, experience, skills,
 * requirements) from vacancy and resume data for cover letter templates.
 *
 * Split from cover-letter-generator.js (AHG Rule 12).
 * v1.9.43.0
 */

import { extractExperienceText, parsePeriodToMonths } from "./cover-letter-experience.js";
import { formatSkillList, restoreOriginalCase } from "./cover-letter-format.js";
import { computeMatchScore } from "./match-scorer.js";

// Re-export for backward compatibility
export { extractExperienceText, parsePeriodToMonths };

/** Maximum skills to mention in the letter */
export const MAX_SKILLS_MENTION = 5;

/** Maximum requirements to quote from vacancy description */
export const MAX_REQUIREMENTS_QUOTE = 3;

/**
 * Extract all placeholder values from vacancy and resume data.
 *
 * @param {Object} vacancy
 * @param {Object|null} resume
 * @returns {Object}
 */
export async function extractPlaceholders(vacancy, resume) {
  const p = {};

  // {position} -- vacancy title
  p.position = vacancy.title || "эту позицию";

  // {company} -- vacancy company
  p.company = vacancy.company || "вашу компанию";

  // {experience} -- years of experience from resume
  p.experience = extractExperienceText(resume);

  // {skills} -- top matching skills (preserving original case from vacancy/resume)
  const matchResult = resume ? await computeMatchScore(resume, vacancy) : null;
  const matchingSkills = matchResult ? matchResult.details.matchingSkills || [] : [];

  // Also include derived matches
  const derivedMatches = matchResult ? matchResult.details.derivedMatchSkills || [] : [];

  // The scorer returns lowercase names. Look up original-case names from vacancy/resume.
  const matchingOriginal = restoreOriginalCase(matchingSkills, vacancy, resume);
  const derivedOriginal = restoreOriginalCase(derivedMatches, vacancy, resume);

  // Combine and limit
  const allMatches = [...matchingOriginal, ...derivedOriginal].slice(0, MAX_SKILLS_MENTION);
  p.skills =
    allMatches.length > 0
      ? formatSkillList(allMatches)
      : vacancy.keySkills && vacancy.keySkills.length > 0
        ? formatSkillList(vacancy.keySkills.slice(0, MAX_SKILLS_MENTION))
        : "сфере деятельности";

  // {matching} -- matching skills as a simple list
  p.matching = allMatches.length > 0 ? allMatches.join(", ") : "";

  // {matching_sentence} -- a sentence about matching skills
  p.matching_sentence =
    allMatches.length > 0
      ? "Мой опыт включает " + formatSkillList(allMatches) + ", что соответствует требованиям вакансии. "
      : "";

  // {requirements} -- key requirements from vacancy description
  p.requirements = extractRequirementsText(vacancy);

  return p;
}

/**
 * Extract key requirements from vacancy description sections.
 *
 * @param {Object} vacancy
 * @returns {string}
 */
export function extractRequirementsText(vacancy) {
  // Try structured description sections first
  if (vacancy.description && vacancy.description.sections) {
    const sections = vacancy.description.sections;

    // Prefer the "requirements" section
    if (sections.requirements && sections.requirements.length > 10) {
      return extractKeyPhrases(sections.requirements, MAX_REQUIREMENTS_QUOTE);
    }

    // Fall back to "responsibilities" section
    if (sections.responsibilities && sections.responsibilities.length > 10) {
      return extractKeyPhrases(sections.responsibilities, MAX_REQUIREMENTS_QUOTE);
    }
  }

  // Try plain description text
  if (vacancy.description && vacancy.description.text && vacancy.description.text.length > 20) {
    return extractKeyPhrases(vacancy.description.text, MAX_REQUIREMENTS_QUOTE);
  }

  return "";
}

/**
 * Extract key phrases from text by picking the most important lines.
 * Simple heuristic: shorter lines with skill-related keywords are prioritized.
 *
 * @param {string} text
 * @param {number} maxPhrases
 * @returns {string}
 */
export function extractKeyPhrases(text, maxPhrases) {
  if (!text) return "";

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && l.length < 150); // Skip too short or too long

  // Prioritize lines that look like bullet points or contain keywords
  const scored = lines.map((line) => {
    let score = 0;
    // Bullet points are usually key requirements
    if (/^[--->]/.test(line)) score += 2;
    // Lines with skill keywords
    if (/зна(?:ние|ю|ния)|владел|опыт|умение|работа\s*с|пониман/i.test(line)) score += 3;
    // Medium-length lines (not too short, not too long)
    if (line.length >= 15 && line.length <= 80) score += 1;
    return { line, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, maxPhrases).map((s) => s.line);
  return selected.join("; ");
}
