/**
 * LIB: COVER LETTER GENERATOR
 * =============================
 * Generates tailored cover letters using vacancy detail data and
 * resume data. Replaces the static template approach with dynamic
 * text that references specific skills, requirements, and experience.
 *
 * Data sources:
 *   - Vacancy: keySkills[], derivedSkills[], description.sections,
 *     title, company, salary, experience
 *   - Resume:  skills[], derivedSkills[], title, experience[],
 *     salary, education
 *
 * Template placeholders:
 *   {position}   → vacancy title
 *   {company}    → vacancy company name
 *   {experience} → years of experience from resume
 *   {skills}     → top matching skills (up to 3)
 *   {matching}   → matching skills list
 *   {requirements} → key requirements from vacancy description
 *
 * v1.9.30.0
 */

import { createLogger } from './anti-hallucination.js';
import { computeMatchScore } from './match-scorer.js';

const clLog = createLogger('CoverLetter');

/** Default template when no custom template is set */
const DEFAULT_TEMPLATE =
  'Здравствуйте! Меня заинтересовала вакансия {position} в {company}. ' +
  'Имею {experience} опыта в {skills}. {matching_sentence}' +
  'Буду рад обсудить детали на интервью.';

/** Maximum cover letter length (hh.ru limit) */
const MAX_LETTER_LENGTH = 5000;

/** Maximum skills to mention in the letter */
const MAX_SKILLS_MENTION = 5;

/** Maximum requirements to quote from vacancy description */
const MAX_REQUIREMENTS_QUOTE = 3;

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Generate a tailored cover letter using vacancy and resume data.
 *
 * @param {Object} vacancy — Parsed vacancy object (shallow or enriched)
 * @param {Object} resume — Parsed resume object
 * @param {Object} [options] — { template, maxLength, includeRequirements }
 * @returns {{ text: string, placeholders: Object, method: string }}
 */
export function generateCoverLetter(vacancy, resume, options) {
  if (!vacancy) {
    clLog.warn('No vacancy provided — returning empty letter');
    return { text: '', placeholders: {}, method: 'none' };
  }

  const template = (options && options.template) || DEFAULT_TEMPLATE;
  const maxLength = (options && options.maxLength) || MAX_LETTER_LENGTH;

  // Step 1: Extract all placeholder values
  const placeholders = extractPlaceholders(vacancy, resume);

  // Step 2: Fill template
  let text = fillTemplate(template, placeholders);

  // Step 3: If template is the default one, try generating a richer letter
  // when we have enriched vacancy data (description sections, keySkills)
  if (template === DEFAULT_TEMPLATE && hasRichData(vacancy, resume)) {
    const richLetter = generateRichLetter(vacancy, resume, placeholders);
    if (richLetter) {
      text = richLetter;
      clLog.info('Generated rich cover letter (' + text.length + ' chars)');
    }
  }

  // Step 4: Truncate if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
    clLog.info('Truncated cover letter to ' + maxLength + ' chars');
  }

  return {
    text,
    placeholders,
    method: hasRichData(vacancy, resume) ? 'rich' : 'template',
  };
}

/**
 * Fill template placeholders with actual values.
 * Supports: {position}, {company}, {experience}, {skills},
 * {matching}, {requirements}, {matching_sentence}
 *
 * @param {string} template — Template string with {placeholder} syntax
 * @param {Object} values — Map of placeholder name → replacement string
 * @returns {string}
 */
export function fillTemplate(template, values) {
  if (!template) return '';
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = '{' + key + '}';
    // Replace all occurrences
    result = result.split(placeholder).join(value || '');
  }
  return result;
}

/**
 * Get vacancy data for cover letter generation.
 * Looks in both panelState.vacancies and window.__hhVacDetail.
 *
 * @param {string} vacancyId
 * @param {Object[]} [vacancies] — panelState.vacancies array
 * @returns {Object|null}
 */
export function findVacancyData(vacancyId, vacancies) {
  // Try panelState vacancies first
  if (Array.isArray(vacancies)) {
    const found = vacancies.find(v => v.id === vacancyId);
    if (found) return found;
  }

  // Try detail page global
  if (window.__hhVacDetail && window.__hhVacDetail.id === vacancyId) {
    return window.__hhVacDetail;
  }

  return null;
}

// ═══════════════════════════════════════════════
// PLACEHOLDER EXTRACTION
// ═══════════════════════════════════════════════

/**
 * Extract all placeholder values from vacancy and resume data.
 *
 * @param {Object} vacancy
 * @param {Object|null} resume
 * @returns {Object}
 */
function extractPlaceholders(vacancy, resume) {
  const p = {};

  // {position} — vacancy title
  p.position = vacancy.title || 'эту позицию';

  // {company} — vacancy company
  p.company = vacancy.company || 'вашу компанию';

  // {experience} — years of experience from resume
  p.experience = extractExperienceText(resume);

  // {skills} — top matching skills (preserving original case from vacancy/resume)
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

  // {matching} — matching skills as a simple list
  p.matching = allMatches.length > 0
    ? allMatches.join(', ')
    : '';

  // {matching_sentence} — a sentence about matching skills
  p.matching_sentence = allMatches.length > 0
    ? 'Мой опыт включает ' + formatSkillList(allMatches) + ', что соответствует требованиям вакансии. '
    : '';

  // {requirements} — key requirements from vacancy description
  p.requirements = extractRequirementsText(vacancy);

  return p;
}

/**
 * Extract years of experience from resume object.
 *
 * @param {Object|null} resume
 * @returns {string}
 */
function extractExperienceText(resume) {
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
        // Parse period "MMM YYYY — Present" or "MMM YYYY — MMM YYYY"
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
 * Handles: "Январь 2020 — Настоящее время", "Jan 2020 — Present",
 * "Мар 2018 — Июн 2022"
 *
 * @param {string} period
 * @returns {number} months
 */
function parsePeriodToMonths(period) {
  if (!period) return 0;

  const months = {
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'мая': 5, 'июн': 6,
    'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  };

  // Match "Month Year — Month Year" or "Month Year — Present/Настоящее"
  const rangeMatch = period.match(/(\w{3})\s*(\d{4})\s*[–\-—]\s*(?:(\w{3})\s*(\d{4})|(настоящее|настоящее время|present|сейчас))/i);
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
function extractRequirementsText(vacancy) {
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
function extractKeyPhrases(text, maxPhrases) {
  if (!text) return '';

  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && l.length < 150); // Skip too short or too long

  // Prioritize lines that look like bullet points or contain keywords
  const scored = lines.map(line => {
    let score = 0;
    // Bullet points are usually key requirements
    if (/^[–\-•·▪▸▹→]/.test(line)) score += 2;
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

// ═══════════════════════════════════════════════
// RICH LETTER GENERATION
// ═══════════════════════════════════════════════

/**
 * Check if we have enough data for a rich cover letter.
 * Requires at least: matching skills + description OR keySkills.
 *
 * @param {Object} vacancy
 * @param {Object|null} resume
 * @returns {boolean}
 */
function hasRichData(vacancy, resume) {
  if (!resume) return false;
  const hasKeySkills = vacancy.keySkills && vacancy.keySkills.length > 0;
  const hasDescription = vacancy.description && vacancy.description.text && vacancy.description.text.length > 50;
  const hasMatching = resume.skills && resume.skills.length > 0;
  return (hasKeySkills || hasDescription) && hasMatching;
}

/**
 * Generate a rich, personalized cover letter using all available data.
 * Structure:
 *   1. Greeting + position reference
 *   2. Experience summary (years, domain)
 *   3. Matching skills highlight
 *   4. Specific value proposition (referencing vacancy requirements)
 *   5. Closing
 *
 * @param {Object} vacancy
 * @param {Object} resume
 * @param {Object} placeholders — pre-extracted placeholder values
 * @returns {string|null} Rich cover letter or null if not enough data
 */
function generateRichLetter(vacancy, resume, placeholders) {
  const parts = [];

  // 1. Greeting
  const company = placeholders.company !== 'вашу компанию'
    ? ' в ' + placeholders.company
    : '';
  parts.push('Здравствуйте! Меня заинтересовала вакансия "' + placeholders.position + '"' + company + '.');

  // 2. Experience summary
  const expText = placeholders.experience !== 'relevant'
    ? ' Имею ' + placeholders.experience + ' опыта.'
    : '';
  if (expText) parts.push(expText);

  // 3. Matching skills (restore original case for display)
  const matchResult = computeMatchScore(resume, vacancy);
  const matchingSkills = restoreOriginalCase(matchResult.details.matchingSkills || [], vacancy, resume);
  const derivedMatches = restoreOriginalCase(matchResult.details.derivedMatchSkills || [], vacancy, resume);
  const synonymMatches = matchResult.details.synonymMatchSkills || [];

  if (matchingSkills.length > 0 || derivedMatches.length > 0) {
    const explicitList = matchingSkills.slice(0, 4);
    const derivedList = derivedMatches.slice(0, 2);

    let skillSentence = 'Владею ' + formatSkillList(explicitList);
    if (derivedList.length > 0) {
      skillSentence += ', также имею практический опыт в ' + formatSkillList(derivedList);
    }
    skillSentence += '.';
    parts.push(skillSentence);
  }

  // 4. Value proposition — reference specific vacancy requirements
  if (vacancy.description && vacancy.description.sections) {
    const sections = vacancy.description.sections;
    const requirementsText = sections.requirements || '';
    const conditionsText = sections.conditions || '';

    // If vacancy has conditions/benefits, show alignment
    if (conditionsText.length > 20) {
      const conditions = extractKeyPhrases(conditionsText, 2);
      if (conditions) {
        parts.push('Условия позиции (' + conditions + ') соответствуют моим карьерным ожиданиям.');
      }
    }
  }

  // 5. Reference matching score context (subtle, not literal score)
  if (matchResult.total >= 70) {
    parts.push('Уверен, что мой опыт и навыки отлично подходят для этой роли.');
  } else if (matchResult.total >= 40) {
    parts.push('Полагаю, что мой опыт будет полезен для вашей команды.');
  }

  // 6. Closing
  parts.push('Буду рад обсудить детали на интервью. Спасибо за рассмотрение!');

  const letter = parts.join(' ');
  return letter.length > 20 ? letter : null;
}

// ═══════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════

/**
 * Format a list of skills as natural Russian text.
 * Examples: ["Python"], ["Python", "SQL"], ["Python", "SQL", "Docker"]
 * → "Python", "Python и SQL", "Python, SQL и Docker"
 *
 * @param {string[]} skills
 * @returns {string}
 */
function formatSkillList(skills) {
  if (!skills || skills.length === 0) return '';
  if (skills.length === 1) return skills[0];
  if (skills.length === 2) return skills[0] + ' и ' + skills[1];
  // 3+: comma-separated with "и" before last
  return skills.slice(0, -1).join(', ') + ' и ' + skills[skills.length - 1];
}

/**
 * Restore original-case skill names from normalized (lowercase) names.
 * The scorer normalizes skill names for matching, but we want to display
 * the original case in the cover letter (e.g., "Python" not "python").
 *
 * @param {string[]} normalizedSkills — lowercase skill names from scorer
 * @param {Object} vacancy — source for vacancy skill names
 * @param {Object|null} resume — source for resume skill names
 * @returns {string[]} original-case skill names
 */
function restoreOriginalCase(normalizedSkills, vacancy, resume) {
  if (!normalizedSkills || normalizedSkills.length === 0) return [];

  // Build a map: normalized → original
  const caseMap = new Map();

  // Collect from vacancy: keySkills, skills, derivedSkills
  const vacSources = [vacancy.keySkills, vacancy.skills, vacancy.derivedSkills];
  for (const arr of vacSources) {
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      const name = typeof s === 'string' ? s : (s?.name || '');
      if (name) caseMap.set(name.toLowerCase().trim().replace(/[-–—]/g, ' ').replace(/ё/g, 'е').replace(/\s+/g, ' '), name);
    }
  }

  // Collect from resume: skills, derivedSkills
  if (resume) {
    const resSources = [resume.skills, resume.derivedSkills];
    for (const arr of resSources) {
      if (!Array.isArray(arr)) continue;
      for (const s of arr) {
        const name = typeof s === 'string' ? s : (s?.name || '');
        if (name) caseMap.set(name.toLowerCase().trim().replace(/[-–—]/g, ' ').replace(/ё/g, 'е').replace(/\s+/g, ' '), name);
      }
    }
  }

  // Map normalized names back to original case
  return normalizedSkills.map(ns => caseMap.get(ns) || ns);
}

/**
 * Pluralize "год/года/лет" based on number.
 *
 * @param {number} n
 * @returns {string}
 */
function pluralYears(n) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (lastDigit > 1 && lastDigit < 5) return 'года';
  if (lastDigit === 1) return 'год';
  return 'лет';
}

/**
 * Pluralize "месяц/месяца/месяцев" based on number.
 *
 * @param {number} n
 * @returns {string}
 */
function pluralMonths(n) {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'месяцев';
  if (lastDigit > 1 && lastDigit < 5) return 'месяца';
  if (lastDigit === 1) return 'месяц';
  return 'месяцев';
}
