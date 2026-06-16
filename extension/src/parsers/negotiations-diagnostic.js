/**
 * PARSER: NEGOTIATIONS DIAGNOSTIC
 * ================================
 * Structured dump of the /applicant/negotiations page state.
 * Useful for debugging selector breakage and verifying anti-hallucination
 * guarantees (e.g. correct parsing of long lists with 50+ items).
 *
 * Pattern follows diagnoseVacancyPage() from src/parsers/vacancy-diagnostic.js.
 * Split from parsers/negotiations.js in v1.9.42.0 (F1.4) for AHG Rule 12.
 *
 * Console usage (after page-world bridge): window.__hhNegDiag && window.__hhNegDiag()
 */

import { findElement, HH_SELECTORS } from '../lib/selectors.js';
import { createLogger, safeGetText, safeGetAttr } from '../lib/anti-hallucination.js';

const diagLog = createLogger('NegDiag');

/** Selector keys to probe, in order: container first, then per-item fields. */
const NEGOTIATION_SELECTOR_NAMES = [
  'negotiationsList',
  'negotiationsItem',
  'negotiationsItemCheckbox',
  'negotiationsItemVacancy',
  'negotiationsItemCompany',
  'negotiationsItemDate',
  'negotiationsItemTag',
  'negotiationsEmployerStats',
];

/**
 * Probe one selector name: did it find anything? which chain step matched?
 * @param {string} name - selector key in HH_SELECTORS
 * @param {Document|Element} root - DOM root
 * @returns {Object} probe result
 */
function probeSelector(name, root) {
  const chain = HH_SELECTORS[name] || [];
  const el = findElement(name, root);
  let matchedSelector = null;
  if (el) {
    for (const sel of chain) {
      try {
        if (root.querySelector(sel) === el) { matchedSelector = sel; break; }
      } catch (_e) { /* invalid selector */ }
    }
  }
  let count = null;
  if (el) {
    try {
      count = root.querySelectorAll(chain.join(', ')).length;
    } catch (_e) { /* invalid compound selector */ }
  }
  return {
    found: el !== null,
    matchedSelector,
    chainLength: chain.length,
    count,
    tag: el ? el.tagName : null,
    dataQa: el ? safeGetAttr(el, 'data-qa', '') : null,
    text: el ? safeGetText(el, '').substring(0, 120) : null,
  };
}

/**
 * Run full negotiations page diagnostic.
 *
 * Returns a structured object describing the page state:
 *   - selectors: per-selector probe (found, matchedSelector, count, text snippet)
 *   - listContainer: tag/data-qa/className/childElementCount
 *   - items: { totalFound, parsedOk, empty, sample[] }
 *   - statuses: { unique[], counts{} }
 *   - rawScan.dataQaContainingNegotiations: all data-qa attributes containing "negotiation"
 *
 * @param {Object} [opts]
 * @param {number} [opts.itemSampleSize=5] - how many items to dump in detail
 * @param {Document|Element} [opts.root=document] - DOM root to inspect
 * @param {Function} [opts.findListContainer] - injectable list finder (for tests)
 * @param {Function} [opts.findItems] - injectable items finder (for tests)
 * @param {Function} [opts.parseItem] - injectable single-item parser (for tests)
 * @returns {Object} diagnostic dump
 */
export function diagnoseNegotiationsDOM(opts) {
  opts = opts || {};
  const sampleSize = opts.itemSampleSize != null ? opts.itemSampleSize : 5;
  const root = opts.root || document;

  // Injectable finders/parser (avoid circular import with parsers/negotiations.js)
  const findList = opts.findListContainer || (() => findElement('negotiationsList', root));
  const findItems = opts.findItems || (() => {
    const listEl = findList();
    if (!listEl) return [];
    const chain = HH_SELECTORS.negotiationsItem || [];
    for (const sel of chain) {
      try {
        const els = listEl.querySelectorAll(sel);
        if (els && els.length > 0) return Array.from(els);
      } catch (_e) { /* invalid selector */ }
    }
    return [];
  });
  const parseItem = opts.parseItem || (() => null);

  const result = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    timestamp: new Date().toISOString(),
    selectors: {},
    listContainer: null,
    items: { totalFound: 0, parsedOk: 0, empty: 0, sample: [] },
    statuses: { unique: [], counts: {} },
    rawScan: { dataQaContainingNegotiations: [] },
  };

  // 1. Probe every known selector
  for (const name of NEGOTIATION_SELECTOR_NAMES) {
    result.selectors[name] = probeSelector(name, root);
  }

  // 2. List container details
  const listEl = findList();
  result.listContainer = listEl
    ? {
        found: true,
        tag: listEl.tagName,
        dataQa: safeGetAttr(listEl, 'data-qa', ''),
        className: (listEl.className || '').substring(0, 120),
        childElementCount: listEl.childElementCount,
      }
    : { found: false };

  // 3. Items: count + sample parse
  const items = findItems();
  result.items.totalFound = items.length;

  const statusCounts = {};
  const statusSet = new Set();
  let parsedOk = 0;
  let empty = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      const parsed = parseItem(items[i], i);
      if (parsed) {
        parsedOk++;
        statusSet.add(parsed.status);
        statusCounts[parsed.status] = (statusCounts[parsed.status] || 0) + 1;
        if (result.items.sample.length < sampleSize) {
          result.items.sample.push({
            index: i,
            id: parsed.id,
            vacancyTitle: parsed.vacancyTitle,
            company: parsed.company,
            date: parsed.date,
            status: parsed.status,
            statusText: parsed.statusText,
            vacancyId: parsed.vacancyId,
            vacancyUrl: parsed.vacancyUrl,
          });
        }
      } else {
        empty++;
      }
    } catch (err) {
      empty++;
      diagLog.warn('diagnose: failed to parse item #' + i + ': ' + err.message);
    }
  }

  result.items.parsedOk = parsedOk;
  result.items.empty = empty;
  result.statuses.unique = Array.from(statusSet);
  result.statuses.counts = statusCounts;

  // 4. Raw scan: all data-qa containing "negotiation" (for discovering new variants)
  const allQa = new Set();
  try {
    root.querySelectorAll('[data-qa]').forEach(el => {
      const qa = el.getAttribute('data-qa');
      if (qa && qa.includes('negotiation')) allQa.add(qa);
    });
  } catch (_e) { /* DOM not available */ }
  result.rawScan.dataQaContainingNegotiations = Array.from(allQa).sort();

  // 5. Post to page-world.js for console access (mirror diagnoseVacancyPage pattern)
  if (typeof window !== 'undefined' && window.postMessage) {
    try {
      window.postMessage({ type: 'HH-AR-NEG-DIAG', payload: result }, '*');
    } catch (_e) { /* postMessage blocked */ }
  }

  diagLog.info('Negotiations diagnostic complete -- ' + parsedOk + '/' + items.length + ' items parsed');
  return result;
}
