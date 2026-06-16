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
 * Diagnostics live in ./negotiations-diagnostic.js (split in v1.9.43.0 for AHG Rule 12).
 *
 * Research: docs/research/04-negotiations-dom-analysis.md
 * v1.9.40.0: Added fetchAndParseNegotiations() for background loading
 * v1.9.43.0: F1.4 — fallback selector chains, scoped helpers, 50+ items tested
 */

import { findElement, findAllElements, HH_SELECTORS } from '../lib/selectors.js';
import { createLogger, extractVacancyId, safeGetText, safeGetAttr } from '../lib/anti-hallucination.js';

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

  const qa = safeGetAttr(tagEl, 'data-qa', '');
  // Extract status suffix from "negotiations-tag negotiations-item-{status}"
  // Status may contain hyphens (e.g. "not-viewed"). \w alone stops at '-'.
  const match = qa.match(/negotiations-item-([\w-]+)/);
  const status = match ? match[1] : 'unknown';

  return {
    status,
    statusText: safeGetText(tagEl, '')
  };
}

/**
 * Find the list container element using the selector fallback chain.
 * Tries HH_SELECTORS.negotiationsList in order; returns first match.
 *
 * @param {Document|Element} root - DOM root to search in
 * @returns {Element|null}
 */
export function findListContainer(root) {
  return findElement('negotiationsList', root);
}

/**
 * Find all negotiation items using the selector fallback chain.
 * Returns [] when no items found (never throws).
 *
 * @param {Document|Element} root - DOM root to search in
 * @returns {Array<Element>}
 */
export function findNegotiationItems(root) {
  // Inside list container — use the selector list directly
  const listEl = findListContainer(root);
  if (listEl) {
    const selectors = HH_SELECTORS.negotiationsItem || [];
    for (const sel of selectors) {
      try {
        const els = listEl.querySelectorAll(sel);
        if (els && els.length > 0) return Array.from(els);
      } catch (_e) { /* invalid selector, skip */ }
    }
  }
  // Fallback: search root document scope
  return findAllElements('negotiationsItem', root);
}

/**
 * Find a descendant element inside `item` matching one of the selector chains.
 *
 * @param {Element} item - container to search inside
 * @param {string} name - selector key in HH_SELECTORS
 * @returns {Element|null}
 */
function findInsideItem(item, name) {
  const selectors = HH_SELECTORS[name] || [];
  for (const sel of selectors) {
    try {
      const el = item.querySelector(sel);
      if (el) return el;
    } catch (_e) { /* invalid selector */ }
  }
  return null;
}

/**
 * Parse a single negotiation item element.
 * Exported for use by negotiations-diagnostic.js (avoids circular import).
 *
 * @param {Element} item - The negotiations-item DOM element
 * @param {number} idx - Item index (for fallback ID generation)
 * @returns {Object|null} Parsed negotiation object, or null if all fields empty
 */
export function parseSingleItem(item, idx) {
  const vacancyEl = findInsideItem(item, 'negotiationsItemVacancy');
  const companyEl = findInsideItem(item, 'negotiationsItemCompany');
  const dateEl = findInsideItem(item, 'negotiationsItemDate');
  const tagEl = findInsideItem(item, 'negotiationsItemTag');

  // Vacancy title and link
  const vacancyTitle = safeGetText(vacancyEl, '');
  // The vacancy link can be the vacancy element itself (if it's an <a>)
  // or a child <a> element
  const linkEl = vacancyEl && vacancyEl.tagName === 'A'
    ? vacancyEl
    : (vacancyEl ? vacancyEl.querySelector('a') : null);
  // For fetched HTML, href may be relative — build full URL
  let vacancyUrl = linkEl ? safeGetAttr(linkEl, 'href', '') : '';
  if (vacancyUrl && !vacancyUrl.startsWith('http')) {
    vacancyUrl = 'https://hh.ru' + vacancyUrl;
  }
  // For current page DOM, use .href (already absolute)
  if (!vacancyUrl && linkEl && linkEl.href) {
    vacancyUrl = linkEl.href;
  }
  const vacancyId = vacancyUrl ? extractVacancyId(vacancyUrl) : '';

  // Company name
  const company = safeGetText(companyEl, '');

  // Date
  const date = safeGetText(dateEl, '');

  // Status
  const { status, statusText } = extractStatus(tagEl);

  // Reject completely empty items (anti-hallucination: don't return ghost rows)
  if (!vacancyTitle && !company && !date && status === 'unknown') {
    return null;
  }

  return {
    id: vacancyId || ('neg-' + idx),
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
    preview: statusText ? (statusText + ' -- ' + company) : company,
    unread: status === 'not-viewed' || status === 'invite',
    parsedAt: new Date().toISOString()
  };
}

/**
 * Parse negotiation items from a DOM root (document or element).
 * @param {Document|Element} root - DOM root to search in
 * @returns {Array<Object>} Parsed negotiation objects
 */
export function parseNegotiationItems(root) {
  root = root || document;

  const listEl = findListContainer(root);
  if (!listEl) {
    negLog.info('No negotiations-list container found');
    return [];
  }

  const items = findNegotiationItems(root);
  if (!items || items.length === 0) {
    negLog.info('No negotiation items found');
    return [];
  }

  negLog.info('Found ' + items.length + ' negotiation items');

  const negotiations = [];
  for (let i = 0; i < items.length; i++) {
    try {
      const parsed = parseSingleItem(items[i], i);
      if (parsed) negotiations.push(parsed);
    } catch (err) {
      negLog.warn('Failed to parse negotiation item #' + i + ': ' + err.message);
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
