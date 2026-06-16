/**
 * PARSER: VACANCY LIST
 * ======================
 * Parses vacancy cards from hh.ru search results page (/search/vacancy)
 * and main page (/) recommended vacancies.
 * Computes match score if active resume is available.
 *
 * "Vacancy of the Day" parsing is in vacancy-list-votd.js.
 * Shared helpers are in vacancy-list-helpers.js.
 *
 * Split from original 265-line file (AHG Rule 12).
 * v1.9.41.0
 */

import { findAllElements, findElement } from '../lib/selectors.js';
import { safeGetText, safeGetAttr, extractVacancyId, validateVacancyData, createLogger } from '../lib/anti-hallucination.js';
import { parseExperienceString } from '../lib/parse-experience.js';
import { findTitleLink, detectSchedule, loadAppliedAndBlacklisted, applyStatusAndScore, sortVacanciesByScore } from './vacancy-list-helpers.js';

// Re-export for backwards compatibility (other modules import from here)
export { parseVacanciesOfTheDay } from './vacancy-list-votd.js';
export { detectSchedule } from './vacancy-list-helpers.js';

const parserLog = createLogger('Parser');

/**
 * Parse vacancy cards from search results or main page.
 * @param {Object|null} resume -- active resume for match scoring (optional)
 * @returns {Promise<Object[]>}
 */
export async function parseVacanciesFromPage(resume) {
  const cards = findAllElements('vacancyCard');
  parserLog.info('Found ' + cards.length + ' vacancy cards');
  if (cards.length === 0) return [];

  const vacancies = [];
  const { appliedIds, blacklisted } = await loadAppliedAndBlacklisted();

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const titleEl = findTitleLink(card);
    const title = safeGetText(titleEl);
    if (!title) continue;
    const url = safeGetAttr(titleEl, 'href', '');
    const id = extractVacancyId(url.startsWith('/') ? 'https://hh.ru' + url : url);
    if (!id) continue;

    const company = safeGetText(findElement('vacancyCompany', card));
    const salary = safeGetText(findElement('vacancySalary', card), '');
    const location = safeGetText(findElement('vacancyLocation', card), '');
    const experience = safeGetText(findElement('vacancyExperience', card), '');

    const tagEls = card.querySelectorAll('.bloko-tag__text, [data-qa="bloko-tag"]');
    const skills = [];
    tagEls.forEach(el => { const t = (el.textContent || '').trim(); if (t && t.length < 50) skills.push(t); });

    const replyBtn = findElement('replyButton', card);
    const hasReply = replyBtn !== null;

    // v1.9.38.0: Detect schedule from location text
    const schedule = detectSchedule(location);

    const vacancy = {
      id, title: title.trim(), company: (company || '').trim(),
      salary: salary || 'Не указана', location: (location || '').trim(), schedule,
      experience: parseExperienceString((experience || '').trim()), skills,
      url: url.startsWith('/') ? 'https://hh.ru' + url : url,
      hasReply, status: 'new', parsedAt: new Date().toISOString(),
      matchScore: null
    };

    const validation = validateVacancyData(vacancy);
    if (!validation.valid) { parserLog.warn('Card #' + i + ' invalid: ' + validation.errors.join(', ')); continue; }

    applyStatusAndScore(vacancy, appliedIds, blacklisted, resume);
    vacancies.push(vacancy);
  }

  // Sort by match score (highest first), new vacancies before applied/blacklisted
  sortVacanciesByScore(vacancies);

  parserLog.info('Parsed ' + vacancies.length + '/' + cards.length + ' valid vacancies');
  return vacancies;
}
