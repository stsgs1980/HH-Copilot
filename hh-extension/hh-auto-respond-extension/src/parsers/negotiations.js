/**
 * PARSER: NEGOTIATIONS
 * =====================
 * Parses the /applicant/negotiations page on hh.ru.
 * Extracts: vacancy title, company, date, status, vacancy ID (from link).
 *
 * Two modes:
 *   - parseNegotiations() — from current page DOM (when user is on /applicant/negotiations)
 *   - fetchAndParseNegotiations() — background fetch + parse (from any page)
 *
 * Research: docs/research/04-negotiations-dom-analysis.md
 * v1.9.40.0: Added fetchAndParseNegotiations() for background loading
 */

import { createLogger, extractVacancyId } from '../lib/anti-hallucination.js';
import { findAllElements, findElement } from '../lib/selectors.js';

const negLog = createLogger('NegParse');

/**
 * Parse status from the tag element's data-qa attribute.
 * data-qa format: "negotiations-tag negotiations-item-{status}"
 * Known statuses: not-viewed, viewed, discard, invite
 *
 * @param {Element} tagEl - The tag element with data-qa
 * @returns {{ status: string, statusText: string }}
 */
function extractStatus(tagEl) {
  if (!tagEl) return { status: 'unknown', statusText: '' };

  const qa = tagEl.dataset.qa || '';
  // Extract status suffix from "negotiations-tag negotiations-item-{status}"
  const match = qa.match(/negotiations-item-(\w+)/);
  const status = match ? match[1] : 'unknown';

  return {
    status,
    statusText: tagEl.textContent?.trim() || ''
  };
}

/**
 * Parse negotiation items from a DOM root (document or element).
 * @param {Document|Element} root - DOM root to search in
 * @returns {Array<Object>} Parsed negotiation objects
 */
function parseNegotiationItems(root) {
  const listEl = root.querySelector('[data-qa="negotiations-list"]');
  if (!listEl) {
    negLog.info('No negotiations-list container found');
    return [];
  }

  const items = listEl.querySelectorAll('[data-qa="negotiations-item"]');
  if (!items || items.length === 0) {
    negLog.info('No negotiation items found');
    return [];
  }

  negLog.info('Found ' + items.length + ' negotiation items');

  const negotiations = [];

  for (const item of items) {
    try {
      const vacancyEl = item.querySelector('[data-qa="negotiations-item-vacancy"]');
      const companyEl = item.querySelector('[data-qa="negotiations-item-company"]');
      const dateEl = item.querySelector('[data-qa="negotiations-item-date"]');
      const tagEl = item.querySelector('[data-qa^="negotiations-tag"]');

      // Vacancy title and link
      const vacancyTitle = vacancyEl?.textContent?.trim() || '';
      // The vacancy link can be the vacancy element itself (if it's an <a>)
      // or a child <a> element
      const linkEl = vacancyEl?.tagName === 'A' ? vacancyEl : vacancyEl?.querySelector('a');
      // For fetched HTML, href may be relative — build full URL
      let vacancyUrl = linkEl?.getAttribute('href') || '';
      if (vacancyUrl && !vacancyUrl.startsWith('http')) {
        vacancyUrl = 'https://hh.ru' + vacancyUrl;
      }
      // For current page DOM, use .href (already absolute)
      if (!vacancyUrl && linkEl?.href) {
        vacancyUrl = linkEl.href;
      }
      const vacancyId = vacancyUrl ? extractVacancyId(vacancyUrl) : '';

      // Company name
      const company = companyEl?.textContent?.trim() || '';

      // Date
      const date = dateEl?.textContent?.trim() || '';

      // Status
      const { status, statusText } = extractStatus(tagEl);

      negotiations.push({
        id: vacancyId || ('neg-' + negotiations.length),
        vacancyTitle,
        vacancyUrl,
        vacancyId,
        company,
        date,
        status,
        statusText,
        // UI compatibility: map to existing conversation model
        name: vacancyTitle || company || 'Без названия',
        time: date,
        preview: statusText ? (statusText + ' — ' + company) : company,
        unread: status === 'not-viewed' || status === 'invite',
        parsedAt: new Date().toISOString()
      });
    } catch (err) {
      negLog.warn('Failed to parse negotiation item: ' + err.message);
    }
  }

  negLog.info('Parsed ' + negotiations.length + ' negotiations');
  return negotiations;
}

/**
 * Parse all negotiation items from the current page.
 * Must be called when the page is /applicant/negotiations.
 *
 * @returns {Array<Object>} Parsed negotiation objects
 */
export async function parseNegotiations() {
  return parseNegotiationItems(document);
}

/**
 * Fetch /applicant/negotiations in the background and parse it.
 * Works from any page — uses fetch() + DOMParser.
 * v1.9.40.0
 *
 * @returns {Array<Object>} Parsed negotiation objects
 */
export async function fetchAndParseNegotiations() {
  const url = 'https://hh.ru/applicant/negotiations';
  negLog.info('Background fetch: ' + url);

  try {
    const resp = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'text/html' }
    });
    if (!resp.ok) {
      negLog.warn('Fetch failed: ' + resp.status);
      return [];
    }
    const html = await resp.text();
    negLog.info('Fetched ' + html.length + ' chars');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return parseNegotiationItems(doc);
  } catch (err) {
    negLog.warn('Background fetch error: ' + err.message);
    return [];
  }
}
