/**
 * LIB: COVER LETTER PLACEHOLDER EXTRACTION
 * =========================================
 * Extracts placeholder values (position, company, experience, skills,
 * requirements) from vacancy and resume data for cover letter templates.
 *
 * Split from cover-letter-generator.js (AHG Rule 12).
 * v1.9.43.0
 */

import { computeMatchScore } from './match-scorer.js';
import { restoreOriginalCase, formatSkillList, pluralYears, pluralMonths } from './cover-letter-format.js';

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
export function extractPlaceholders(vacancy, resume) {
  const p = {};

  // {position} -- vacancy title
  p.position = vacancy.title || 'эту позицию';

  // {company} -- vacancy company
  p.company = vacancy.company || 'вашу компанию';

  // {experience} -- years of experience from resume
  p.experience = extractExperienceText(resume);

  // {skills} -- top matching skills (preserving original case from vacancy/resume)
  const matchResult = resume ? computeMatchScore(resume, vacancy) : null;
  const matchingSkills = matchResult ? (matchResult.details.matchingSkills || []) : [];

  // Also include derived matches
  const derivedMatches = matchResult ? (matchResult.details.derivedMatchSkills || []) : [];

  // The scorer returns lowercase names. Look up original-case names from vacancy/resume.
  const matchingOriginal = restoreOriginalCase(matchingSkills, vacancy, resume);
  const derivedOriginal = restoreOriginalCase(derivedMatches, vacancy, resume);

  // Combine and limit
  const allMatches = [...matchingOriginal, ...derivedOriginal].slice(0, MAX_SKILLS_MENTION);
  p.skills = allMatches.length > 0
    ? formatSkillList(allMatches)
    : (vacancy.keySkills && vacancy.keySkills.length > 0
      ? formatSkillList(vacancy.keySkills.slice(0, MAX_SKILLS_MENTION))
      : 'сфере деятельности');

  // {matching} -- matching skills as a simple list
  p.matching = allMatches.length > 0
    ? allMatches.join(', ')
    : '';

  // {matching_sentence} -- a sentence about matching skills
  p.matching_sentence = allMatches.length > 0
    ? 'Мой опыт включает ' + formatSkillList(allMatches) + ', что соответствует требованиям вакансии. '
    : '';

  // {requirements} -- key requirements from vacancy description
  p.requirements = extractRequirementsText(vacancy);

  return p;
}

/**
 * Extract years of experience from resume object.
 *
 * @param {Object|null} resume
 * @returns {string}
 */
export function extractExperienceText(resume) {
  if (!resume) return 'relevant';

  // Try total experience from resume
  if (resume.experienceTotal) {
    return resume.experienceTotal;
  }

  // Calculate from experience entries
  if (resume.experience && Array.isArray(resume.experience) && resume.experience.length > 0) {
    let totalMonths = 0;

    for (const entry of resume.experience) {
      if (entry.duration) {
        // Parse "X лет Y месяцев" or "X год/года/лет" or "Y месяцев/месяца"
        const years = entry.duration.match(/(\d+)\s*(лет|год|года)/i);
        const months = entry.duration.match(/(\d+)\s*(месяц|месяца|месяцев)/i);
        if (years) totalMonths += parseInt(years[1], 10) * 12;
        if (months) totalMonths += parseInt(months[1], 10);
      } else if (entry.period) {
        // Parse period "MMM YYYY -- Present" or "MMM YYYY -- MMM YYYY"
        const periodMonths = parsePeriodToMonths(entry.period);
        if (periodMonths > 0) totalMonths += periodMonths;
      }
    }

    if (totalMonths > 0) {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      if (years > 0 && months > 0) {
        return years + ' ' + pluralYears(years) + ' ' + months + ' ' + pluralMonths(months);
      } else if (years > 0) {
        return years + ' ' + pluralYears(years);
      } else {
        return months + ' ' + pluralMonths(months);
      }
    }
  }

  // Count experience entries as a rough indicator
  if (resume.experience && resume.experience.length > 0) {
    return 'опыт в ' + resume.experience[0].position || 'сфере';
  }

  return 'relevant';
}

/**
 * Parse a date period string into approximate months.
 * Handles: "Январь 2020 -- Настоящее время", "Jan 2020 -- Present",
 * "Мар 2018 -- Июн 2022"
 *
 * @param {string} period
 * @returns {number} months
 */
export function parsePeriodToMonths(period) {
  if (!period) return 0;

  const months = {
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'мая': 5, 'июн': 6,
    'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  };

  // Match "Month Year -- Month Year" or "Month Year -- Present/Настоящее"
  const rangeMatch = period.match(/(\w{3})\s*(\d{4})\s*[\u2013\u2014-]\s*(?:(\w{3})\s*(\d{4})|(настоящее|настоящее время|present|сейчас))/i);
  if (!rangeMatch) return 0;

  const startMonth = months[rangeMatch[1].toLowerCase().substring(0, 3)] || 1;
  const startYear = parseInt(rangeMatch[2], 10);

  let endMonth, endYear;
  if (rangeMatch[5]) {
    // Present time
    const now = new Date();
    endMonth = now.getMonth() + 1;
    endYear = now.getFullYear();
  } else {
    endMonth = months[rangeMatch[3].toLowerCase().substring(0, 3)] || 1;
    endYear = parseInt(rangeMatch[4], 10);
  }

  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  return Math.max(0, totalMonths);
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

  return '';
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
  if (!text) return '';

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && l.length < 150); // Skip too short or too long

  // Prioritize lines that look like bullet points or contain keywords
  const scored = lines.map(line => {
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

  const selected = scored.slice(0, maxPhrases).map(s => s.line);
  return selected.join('; ');
}
