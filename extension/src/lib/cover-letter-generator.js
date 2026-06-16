/**
 * LIB: COVER LETTER GENERATOR (orchestrator)
 * ===========================================
 * Public API + orchestration logic for cover letter generation.
 *
 * Heavy lifting is delegated to:
 *   - cover-letter-placeholders.js  -- placeholder extraction
 *   - cover-letter-rich.js          -- rich letter generation
 *   - cover-letter-format.js        -- formatting helpers
 *
 * Split from original 539-line file (AHG Rule 12).
 * v1.9.42.0
 */

import { createLogger } from './anti-hallucination.js';
import { extractPlaceholders } from './cover-letter-placeholders.js';
import { hasRichData, generateRichLetter } from './cover-letter-rich.js';

const clLog = createLogger('CoverLetter');

/** Default template when no custom template is set */
const DEFAULT_TEMPLATE =
  'Здравствуйте! Меня заинтересовала вакансия {position} в {company}. ' +
  'Имею {experience} опыта в {skills}. {matching_sentence}' +
  'Буду рад обсудить детали на интервью.';

/** Maximum cover letter length (hh.ru limit) */
const MAX_LETTER_LENGTH = 5000;

// ===============================================
// PUBLIC API
// ===============================================

/**
 * Generate a tailored cover letter using vacancy and resume data.
 *
 * @param {Object} vacancy -- Parsed vacancy object (shallow or enriched)
 * @param {Object} resume -- Parsed resume object
 * @param {Object} [options] -- { template, maxLength, includeRequirements }
 * @returns {{ text: string, placeholders: Object, method: string }}
 */
export function generateCoverLetter(vacancy, resume, options) {
  if (!vacancy) {
    clLog.warn('No vacancy provided -- returning empty letter');
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
 * @param {string} template -- Template string with {placeholder} syntax
 * @param {Object} values -- Map of placeholder name -> replacement string
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
 * @param {Object[]} [vacancies] -- panelState.vacancies array
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
