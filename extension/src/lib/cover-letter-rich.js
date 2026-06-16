/**
 * LIB: COVER LETTER RICH GENERATION
 * ==================================
 * Generates rich, personalized cover letters using all available
 * vacancy + resume data (keySkills, description sections, matching score).
 *
 * Split from cover-letter-generator.js (AHG Rule 12).
 * v1.9.42.0
 */

import { computeMatchScore } from './match-scorer.js';
import { restoreOriginalCase, formatSkillList } from './cover-letter-format.js';
import { extractKeyPhrases } from './cover-letter-placeholders.js';

/**
 * Check if we have enough data for a rich cover letter.
 * Requires at least: matching skills + description OR keySkills.
 *
 * @param {Object} vacancy
 * @param {Object|null} resume
 * @returns {boolean}
 */
export function hasRichData(vacancy, resume) {
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
 * @param {Object} placeholders -- pre-extracted placeholder values
 * @returns {string|null} Rich cover letter or null if not enough data
 */
export function generateRichLetter(vacancy, resume, placeholders) {
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

  // 4. Value proposition -- reference specific vacancy requirements
  if (vacancy.description && vacancy.description.sections) {
    const sections = vacancy.description.sections;
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
