/**
 * AGGREGATOR: NEGOTIATIONS CROSS-TAB (F1.8)
 * =========================================
 * Fetches negotiations from ALL hh.ru tabs and merges into a single
 * deduplicated list with .tabOrigin field.
 *
 * Design: each tab has its own URL with ?status=<id>. fetchTab() fetches
 * HTML, parses with existing parseNegotiationItems(). fetchAllNegotiations()
 * loops tabs rate-limited (1 req/sec). Cache 30s in chrome.storage.local
 * key 'negotiations:all'. Partial failure: failed tab -> [], error logged.
 *
 * Anti-hallucination: empty tabs -> [] (never ghost rows). Failed tab ->
 * { items: [], error } doesn't crash others. Dedup by topic_id (vacancyId),
 * fallback to vacancyTitle+company. Cache served only if fresh.
 *
 * v1.9.42.0 -- F1.8
 */

import { parseNegotiationItems } from './negotiations.js';
import { createLogger } from '../lib/anti-hallucination.js';

const aggLog = createLogger('NegAgg');

/** Negotiation tabs on hh.ru. `url` uses ?status= query (hh.ru SPA convention). */
const NEGOTIATION_TABS = [
  { id: 'all',      label: 'Все',             url: 'https://hh.ru/applicant/negotiations?status=all' },
  { id: 'invite',   label: 'Приглашение',     url: 'https://hh.ru/applicant/negotiations?status=invite' },
  { id: 'consider', label: 'Собеседование',   url: 'https://hh.ru/applicant/negotiations?status=consider' },
  { id: 'offer',    label: 'Выход на работу', url: 'https://hh.ru/applicant/negotiations?status=offer' },
  { id: 'wait',     label: 'Ожидание',        url: 'https://hh.ru/applicant/negotiations?status=wait' },
  { id: 'discard',  label: 'Отказ',           url: 'https://hh.ru/applicant/negotiations?status=discard' },
  { id: 'deleted',  label: 'Удалённые',       url: 'https://hh.ru/applicant/negotiations?status=deleted' },
  { id: 'archive',  label: 'Архив',           url: 'https://hh.ru/applicant/negotiations?status=archive' }
];

const CACHE_KEY = 'negotiations:all';
const CACHE_TTL_MS = 30 * 1000;
const RATE_LIMIT_MS = 1000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Read cached aggregated result from chrome.storage.local.
 * Returns null if missing/expired/non-extension context.
 */
async function readCache() {
  if (!chrome?.storage?.local) return null;
  try {
    const { [CACHE_KEY]: cached } = await chrome.storage.local.get(CACHE_KEY);
    if (!cached?.timestamp) return null;
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) {
      aggLog.info('Cache expired (age=' + age + 'ms)');
      return null;
    }
    aggLog.info('Cache hit (age=' + age + 'ms)');
    return cached.data;
  } catch (err) {
    aggLog.warn('Cache read error: ' + err.message);
    return null;
  }
}

/** Write aggregated result to chrome.storage.local. */
async function writeCache(data) {
  if (!chrome?.storage?.local) return;
  try {
    await chrome.storage.local.set({ [CACHE_KEY]: { timestamp: Date.now(), data } });
  } catch (err) {
    aggLog.warn('Cache write error: ' + err.message);
  }
}

/**
 * Fetch a single tab and parse items.
 * @param {Object} tab - Tab descriptor from NEGOTIATION_TABS
 * @param {Object} [opts] - { fetchImpl, domParserImpl, parseItemsImpl } for tests
 * @returns {Promise<{tab: string, label: string, items: Array, error: string|null}>}
 */
export async function fetchTab(tab, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const ParserCtor = opts.domParserImpl || DOMParser;
  const parser = opts.parseItemsImpl || parseNegotiationItems;
  const result = { tab: tab.id, label: tab.label, items: [], error: null };

  try {
    const resp = await fetchImpl(tab.url, {
      credentials: 'include',
      headers: { 'Accept': 'text/html' }
    });
    if (!resp.ok) {
      result.error = 'HTTP ' + resp.status;
      aggLog.warn('Tab ' + tab.id + ' fetch failed: ' + result.error);
      return result;
    }
    const html = await resp.text();
    const doc = new ParserCtor().parseFromString(html, 'text/html');
    result.items = parser(doc) || [];
    aggLog.info('Tab ' + tab.id + ': ' + result.items.length + ' items');
  } catch (err) {
    result.error = err.message || String(err);
    aggLog.warn('Tab ' + tab.id + ' error: ' + result.error);
  }
  return result;
}

/**
 * Deduplicate by topic id (vacancyId), fallback to vacancyTitle+company.
 * First occurrence wins; subsequent duplicates append tabOrigin to alsoIn[].
 */
export function deduplicateByTopic(items) {
  if (!items || typeof items[Symbol.iterator] !== 'function') return [];
  const seen = new Map();
  const result = [];

  for (const item of items) {
    if (!item) continue;
    const key = item.vacancyId
      || ((item.vacancyTitle || '') + '|' + (item.company || '')).toLowerCase();
    if (!key || key === '|') continue;

    if (seen.has(key)) {
      const existing = result[seen.get(key)];
      if (!existing.alsoIn) existing.alsoIn = [];
      if (!existing.alsoIn.includes(item.tabOrigin)) {
        existing.alsoIn.push(item.tabOrigin);
      }
    } else {
      seen.set(key, result.length);
      result.push({ ...item });
    }
  }
  return result;
}

/**
 * Fetch negotiations from ALL tabs, merge, deduplicate.
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false] - bypass cache
 * @param {Array<string>} [opts.tabs] - subset of tab ids (default: all)
 * @param {Function} [opts.fetchImpl] - inject for tests
 * @param {Function} [opts.domParserImpl] - inject DOMParser ctor for tests
 * @param {Function} [opts.parseItemsImpl] - inject parser for tests
 * @param {Function} [opts.sleepImpl] - inject sleep for tests
 * @returns {Promise<{items: Array, perTab: Object, errors: Array, fromCache: boolean, fetchedAt: string}>}
 */
export async function fetchAllNegotiations(opts = {}) {
  const forceRefresh = opts.forceRefresh || false;
  const tabsFilter = opts.tabs || null;
  const sleepImpl = opts.sleepImpl || sleep;

  if (!forceRefresh) {
    const cached = await readCache();
    if (cached) return { ...cached, fromCache: true };
  }

  const tabs = tabsFilter
    ? NEGOTIATION_TABS.filter(t => tabsFilter.includes(t.id))
    : NEGOTIATION_TABS;

  const perTab = {};
  const errors = [];
  const allItems = [];

  for (let i = 0; i < tabs.length; i++) {
    if (i > 0) await sleepImpl(RATE_LIMIT_MS);
    const res = await fetchTab(tabs[i], opts);
    perTab[res.tab] = { count: res.items.length };
    if (res.error) {
      perTab[res.tab].error = res.error;
      errors.push(res.tab + ': ' + res.error);
    }
    for (const item of res.items) {
      if (item) item.tabOrigin = res.tab;
      allItems.push(item);
    }
  }

  const merged = deduplicateByTopic(allItems);
  const result = {
    items: merged,
    perTab,
    errors,
    fromCache: false,
    fetchedAt: new Date().toISOString(),
    totalCount: merged.length,
    rawCount: allItems.filter(Boolean).length
  };

  aggLog.info('Aggregated: ' + merged.length + ' unique / '
    + allItems.filter(Boolean).length + ' raw, '
    + errors.length + ' errors');

  await writeCache(result);
  return result;
}

/** Invalidate cache (forces next fetchAllNegotiations to refetch). */
export async function invalidateNegotiationsCache() {
  if (!chrome?.storage?.local) return;
  try {
    await chrome.storage.local.remove(CACHE_KEY);
    aggLog.info('Cache invalidated');
  } catch (err) {
    aggLog.warn('Cache invalidate error: ' + err.message);
  }
}

export { NEGOTIATION_TABS, CACHE_KEY, CACHE_TTL_MS };

