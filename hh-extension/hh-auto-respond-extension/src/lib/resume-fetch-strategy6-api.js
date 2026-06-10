/**
 * Strategy 6 — applicant API approach + JSON/expanded-doc result parsing.
 *
 * Contains:
 *   - tryApplicantApi() — fetch from internal hh.ru applicant API endpoints
 *   - parseExperienceFromJson() — parse JSON API responses
 *   - parseExperienceFromExpandedDoc() — parse expanded HTML documents
 *
 * Shared by resume-fetch-strategy6-urls.js and resume-fetch-strategy6-expand.js.
 *
 * Split from resume-fetch-strategy6-expand.js for modularity.
 */
import { createLogger } from './anti-hallucination.js';
import { buildEntryFromApiItem, findExperienceInObject } from './resume-fetch-json-utils.js';
import { parseCompanyCardFromDoc } from './resume-fetch-parse.js';
import { parseExperienceFromHtmlText } from './resume-fetch-strategy4-text.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Try internal hh.ru applicant API endpoints for full experience data.
 * @param {string} resumeId - Resume hash ID
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Promise<Array>} Parsed experience entries (may be same count or more)
 */
export async function tryApplicantApi(resumeId, currentCount) {
  if (!resumeId) return [];

  const apiUrls = [
    { url: 'https://hh.ru/applicant/api/v1/resumes/' + resumeId, source: 'applicant-api-v1' },
    { url: 'https://hh.ru/applicant/api/resumes/' + resumeId, source: 'applicant-api' },
    { url: 'https://hh.ru/applicant/resumes/api/get?resumeId=' + resumeId, source: 'resumes-api-get' },
  ];

  for (const { url, source } of apiUrls) {
    try {
      fetchLog.info('Strategy 6: trying API [' + source + '] ' + url);
      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      if (!resp.ok) {
        fetchLog.info('Strategy 6: [' + source + '] returned ' + resp.status);
        continue;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const data = await resp.json();
        fetchLog.info('Strategy 6: [' + source + '] returned JSON with keys: ' +
          (typeof data === 'object' ? Object.keys(data).slice(0, 10).join(',') : typeof data));

        const jsonEntries = parseExperienceFromJson(data);
        if (jsonEntries.length > currentCount) {
          fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + jsonEntries.length + ' experiences');
          return jsonEntries;
        }
        fetchLog.info('Strategy 6: [' + source + '] JSON had ' + jsonEntries.length + ' experiences (need > ' + currentCount + ')');
      }
    } catch (err) {
      fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
    }
  }

  return [];
}

/**
 * Parse experience entries from a JSON API response.
 * Handles hh.ru API format: { experience: [{ position, company, start, end, ... }] }
 * @param {object} data - JSON API response
 * @returns {Array} Parsed experience entries
 */
export function parseExperienceFromJson(data) {
  const entries = [];

  const exp = data?.experience || data?.resume?.experience ||
              data?.result?.experience || data?.items;

  if (!Array.isArray(exp)) {
    const found = findExperienceInObject(data, 0);
    if (found) {
      found.forEach(item => {
        const job = buildEntryFromApiItem(item);
        if (job.position || job.company) entries.push(job);
      });
    }
    return entries;
  }

  exp.forEach(item => {
    const job = buildEntryFromApiItem(item);
    if (job.position || job.company) entries.push(job);
  });

  return entries;
}

/**
 * Parse experience from an expanded HTML document.
 * Uses the same strategies as the main parser but starts fresh.
 * Shared by URL expansion approach and query parameter approach.
 * @param {Document} expandedDoc - Parsed document from expanded HTML
 * @param {string} expandedHtml - Raw expanded HTML string
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Array} Parsed experience entries
 */
export function parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount) {
  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: company cards
  const allCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach(c => { if (!seen.has(c)) { seen.add(c); uniqueCards.push(c); } });

  uniqueCards.forEach(card => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  // Strategy 2: stepper supplement
  const expCard = expandedDoc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position || job.period) entries.push(job);
    });
  }

  // Strategy 3: text patterns if still not enough
  if (entries.length <= currentCount && expandedHtml) {
    const textParsed = parseExperienceFromHtmlText(expandedHtml, entries.length);
    if (textParsed.length > entries.length) {
      entries.length = 0;
      entries.push(...textParsed);
    }
  }

  return entries;
}
