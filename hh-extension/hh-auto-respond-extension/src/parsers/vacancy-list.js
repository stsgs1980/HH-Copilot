/**
 * PARSER: VACANCY LIST
 * ======================
 * Parses vacancy cards from hh.ru search results page (/search/vacancy)
 * and main page (/) recommended vacancies + "Vacancy of the Day".
 * Computes match score if active resume is available.
 */

import { findAllElements, findElement } from '../lib/selectors.js';
import { safeGetText, safeGetAttr, extractVacancyId, validateVacancyData, createLogger } from '../lib/anti-hallucination.js';
import { getBlacklistedCompanies, getAppliedVacancies } from '../lib/storage.js';
import { computeMatchScore } from '../lib/match-scorer.js';
import { parseExperienceString } from '../lib/parse-experience.js';

const parserLog = createLogger('Parser');

/**
 * Find title link element within a vacancy card.
 * Tries standard data-qa selectors first, then falls back to any <a>
 * linking to /vacancy/ (needed on main page where data-qa may differ).
 */
function findTitleLink(card) {
  // Standard selectors: data-qa="serp-item__title" or "vacancy-serp__vacancy-title"
  const titleEl = findElement('vacancyTitleLink', card);
  if (titleEl) return titleEl;

  // Fallback: find any <a> inside card that links to a vacancy detail page
  const links = card.querySelectorAll('a[href*="/vacancy/"]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (/\/vacancy\/\d+/.test(href)) return link;
  }

  return null;
}

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
  let appliedIds = [], blacklisted = [];
  try {
    appliedIds = await getAppliedVacancies();
    blacklisted = await getBlacklistedCompanies();
  } catch (e) {}

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

    const vacancy = {
      id, title: title.trim(), company: (company || '').trim(),
      salary: salary || 'Не указана', location: (location || '').trim(),
      experience: parseExperienceString((experience || '').trim()), skills,
      url: url.startsWith('/') ? 'https://hh.ru' + url : url,
      hasReply, status: 'new', parsedAt: new Date().toISOString(),
      matchScore: null
    };

    const validation = validateVacancyData(vacancy);
    if (!validation.valid) { parserLog.warn('Card #' + i + ' invalid: ' + validation.errors.join(', ')); continue; }

    if (appliedIds.includes(vacancy.id)) vacancy.status = 'applied';
    if (blacklisted.includes(vacancy.company)) vacancy.status = 'blacklisted';

    // Compute match score if resume available
    if (resume) {
      try {
        const score = computeMatchScore(resume, vacancy);
        vacancy.matchScore = score.total;
      } catch (e) {}
    }

    vacancies.push(vacancy);
  }

  // Sort by match score (highest first), new vacancies before applied/blacklisted
  vacancies.sort((a, b) => {
    const scoreA = a.matchScore != null ? a.matchScore : -1;
    const scoreB = b.matchScore != null ? b.matchScore : -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (a.status === 'new' && b.status !== 'new') return -1;
    if (b.status === 'new' && a.status !== 'new') return 1;
    return 0;
  });

  parserLog.info('Parsed ' + vacancies.length + '/' + cards.length + ' valid vacancies');
  return vacancies;
}

/**
 * Parse "Vacancy of the Day" cards from hh.ru main page.
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
 * @param {Object|null} resume -- active resume for match scoring (optional)
 * @returns {Promise<Object[]>}
 */
export async function parseVacanciesOfTheDay(resume) {
  const titleEls = findAllElements('vacancyOfTheDayTitle');
  parserLog.info('Found ' + titleEls.length + ' "Vacancy of the Day" items');
  if (titleEls.length === 0) return [];

  const vacancies = [];
  let appliedIds = [], blacklisted = [];
  try {
    appliedIds = await getAppliedVacancies();
    blacklisted = await getBlacklistedCompanies();
  } catch (e) {}

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
      parserLog.warn('VotD #' + i + ': could not extract vacancy ID -- skipping');
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
      salary: salary || 'Не указана', location: '',
      experience: parseExperienceString(''), skills: [],
      url: canonicalUrl,
      hasReply: !!replyEl, status: 'new', source: 'votd', isAd: true,
      parsedAt: new Date().toISOString(), matchScore: null
    };

    if (appliedIds.includes(vacancy.id)) vacancy.status = 'applied';
    if (blacklisted.includes(vacancy.company)) vacancy.status = 'blacklisted';

    if (resume) {
      try {
        const score = computeMatchScore(resume, vacancy);
        vacancy.matchScore = score.total;
      } catch (e) {}
    }

    vacancies.push(vacancy);
  }

  parserLog.info('Parsed ' + vacancies.length + '/' + titleEls.length + ' "Vacancy of the Day" items');
  return vacancies;
}
