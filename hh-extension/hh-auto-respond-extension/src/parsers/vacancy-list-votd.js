/**
 * PARSER: VACANCY OF THE DAY (VotD)
 * ===================================
 * Parses "Vacancy of the Day" cards from hh.ru main page.
 *
 * DOM structure (from real hh.ru main page):
 *   <a href="content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=XXX...">
 *     <div data-qa="vacancy_of_the_day_title">Title</div>
 *   </a>
 *   <div data-qa="vacancy_of_the_day_compensation">Salary</div>
 *   <div data-qa="vacancy_of_the_day_company">Company</div>
 *
 * Key: vacancy ID is in the click-URL's ?vacancyId=XXX param,
 * NOT in /vacancy/XXX path. extractVacancyId() handles both formats.
 *
 * Split from vacancy-list.js (AHG Rule 12).
 * v1.9.41.0
 */

import { findAllElements } from '../lib/selectors.js';
import { extractVacancyId, createLogger } from '../lib/anti-hallucination.js';
import { parseExperienceString } from '../lib/parse-experience.js';
import { loadAppliedAndBlacklisted, applyStatusAndScore } from './vacancy-list-helpers.js';

const votdLog = createLogger('VotD');

/**
 * Parse "Vacancy of the Day" cards from hh.ru main page.
 *
 * @param {Object|null} resume -- active resume for match scoring (optional)
 * @returns {Promise<Object[]>}
 */
export async function parseVacanciesOfTheDay(resume) {
  const titleEls = findAllElements('vacancyOfTheDayTitle');
  votdLog.info('Found ' + titleEls.length + ' "Vacancy of the Day" items');
  if (titleEls.length === 0) return [];

  const vacancies = [];
  const { appliedIds, blacklisted } = await loadAppliedAndBlacklisted();

  for (let i = 0; i < titleEls.length; i++) {
    const titleEl = titleEls[i];
    const title = (titleEl.textContent || '').trim();
    if (!title) continue;

    // -- Extract vacancy ID from the tracking click-URL --
    // The title <div> is inside an <a> with tracking href like:
    //   content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=132537734&...
    // Or for sponsored: adsrv.hh.ru/click?...vacancyId=... (encoded in meta param)
    let vacancyId = '';
    const clickLink = titleEl.closest('a');
    if (clickLink) {
      const clickHref = clickLink.getAttribute('href') || '';
      vacancyId = extractVacancyId(clickHref);
    }
    // Fallback 1: walk up and find any <a> with vacancyId param
    if (!vacancyId) {
      const parentBlock = titleEl.closest('section') || titleEl.closest('[class*="vacancy-of-the-day"]') || titleEl.parentElement?.parentElement;
      if (parentBlock) {
        const links = parentBlock.querySelectorAll('a[href*="vacancyId="]');
        for (const link of links) {
          const id = extractVacancyId(link.getAttribute('href') || '');
          if (id) { vacancyId = id; break; }
        }
      }
    }

    // Fallback 2: sponsored VotD (adsrv.hh.ru) -- vacancy ID is in parent element's id attribute
    // e.g. <div id="131408939">...<a href="adsrv.hh.ru/click?meta=..."><div data-qa="vacancy_of_the_day_title">...
    if (!vacancyId) {
      let ancestor = titleEl.parentElement;
      while (ancestor && ancestor !== document.body) {
        const attrId = ancestor.getAttribute('id');
        if (attrId && /^\d{6,12}$/.test(attrId)) {
          vacancyId = attrId;
          break;
        }
        ancestor = ancestor.parentElement;
      }
    }

    if (!vacancyId) {
      votdLog.warn('VotD #' + i + ': could not extract vacancy ID -- skipping');
      continue;
    }

    // -- Find compensation and company --
    // They are siblings near the title, walk up to their common parent
    const container = titleEl.closest('div[class]') || titleEl.parentElement;
    const searchRoot = container?.parentElement || container;

    const compEl = searchRoot?.querySelector('[data-qa="vacancy_of_the_day_compensation"]')
      || container?.querySelector('[data-qa="vacancy_of_the_day_compensation"]');
    const companyEl = searchRoot?.querySelector('[data-qa="vacancy_of_the_day_company"]')
      || container?.querySelector('[data-qa="vacancy_of_the_day_company"]');

    const salary = compEl ? (compEl.textContent || '').trim() : 'Не указана';
    const company = companyEl ? (companyEl.textContent || '').trim() : '';

    // -- Check for reply/apply button --
    const replyEl = searchRoot?.querySelector('[data-qa="vacancy-response-link-top-again"]')
      || container?.querySelector('[data-qa="vacancy-response-link-top-again"]');

    // -- Build vacancy object with canonical hh.ru URL --
    const canonicalUrl = 'https://hh.ru/vacancy/' + vacancyId;

    const vacancy = {
      id: vacancyId, title, company,
      salary: salary || 'Не указана', location: '', schedule: 'unknown',
      experience: parseExperienceString(''), skills: [],
      url: canonicalUrl,
      hasReply: !!replyEl, status: 'new', source: 'votd', isAd: true,
      parsedAt: new Date().toISOString(), matchScore: null
    };

    applyStatusAndScore(vacancy, appliedIds, blacklisted, resume);
    vacancies.push(vacancy);
  }

  votdLog.info('Parsed ' + vacancies.length + '/' + titleEls.length + ' "Vacancy of the Day" items');
  return vacancies;
}
