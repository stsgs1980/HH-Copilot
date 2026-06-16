/**
 * LIB: VACANCY FETCH -- Orchestrator
 * ====================================
 * Fetches vacancy detail pages in the background to enrich shallow
 * SERP data with full skill lists, descriptions, and structured
 * salary/experience data for accurate match scoring.
 *
 * Flow:
 *   1. User lands on /search/vacancy -> parseVacanciesFromPage() -> shallow vacancies
 *   2. enrichFromCache() -- merge previously stored detail data
 *   3. fetchVacancyDetails() -- iframe/text fetch for missing details
 *   4. Re-score with computeMatchScore() using enriched data
 *   5. Update UI with accurate scores
 *
 * Rate limiting:
 *   - gaussianDelay(1500, 3500) between fetches -- not to DDoS hh.ru
 *   - Max 5 concurrent iframe elements
 *   - Priority: vacancies with higher initial score first
 *   - Stale cache check: skip if detail was parsed < 24h ago
 *
 * Architecture mirrors resume-fetch.js but simpler:
 *   - No visibility detection
 *   - No hidden section expansion
 *   - 2 strategies (iframe + text) vs 6 for resumes
 *
 * v1.9.29.0
 */

import { createLogger } from './anti-hallucination.js';
import { gaussianDelay } from './timing.js';
import { getVacancyDetails, saveVacancyDetail, saveVacancyScore } from './storage-vacancies.js';
import { fetchVacancyViaIframe } from './vacancy-fetch-iframe.js';
import { fetchVacancyViaText } from './vacancy-fetch-text.js';
import { enrichVacancy, enrichVacanciesFromCache, isDetailFresh } from './vacancy-fetch-enrichment.js';

const fetchLog = createLogger('VacFetch');

/** Max number of vacancies to fetch per batch */
const MAX_FETCH_PER_BATCH = 50;

/** Min delay between fetches (ms) */
const FETCH_DELAY_MIN = 1500;

/** Max delay between fetches (ms) */
const FETCH_DELAY_MAX = 3500;

/** Cache TTL for stored details (24 hours) */
const _CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Whether a fetch batch is currently running */
let isFetching = false;

/** Abort flag for the current batch */
let abortFetch = false;

// ===============================================
// PUBLIC API
// ===============================================

/**
 * Enrich vacancies from cache only (no network requests).
 * Call this immediately after parsing SERP for instant partial enrichment.
 *
 * @param {Object[]} vacancies -- Shallow vacancy objects from vacancy-list parser
 * @param {Object|null} resume -- Active resume for re-scoring
 * @returns {Promise<{ enriched: number, cached: number, skipped: number }>}
 */
export async function enrichFromCache(vacancies, resume) {
  if (!vacancies || vacancies.length === 0) return { enriched: 0, cached: 0, skipped: 0 };

  try {
    const storedDetails = await getVacancyDetails();
    const result = enrichVacanciesFromCache(vacancies, storedDetails, resume);
    fetchLog.info('Cache enrichment: ' + result.enriched + '/' + vacancies.length + ' vacancies enriched');
    return result;
  } catch (err) {
    fetchLog.warn('Cache enrichment failed: ' + err.message);
    return { enriched: 0, cached: 0, skipped: vacancies.length };
  }
}

/**
 * Fetch and enrich vacancy details in the background.
 * Uses iframe (primary) and text fetch (fallback) strategies.
 * Respects rate limits and cache freshness.
 *
 * @param {Object[]} vacancies -- Shallow vacancy objects to enrich
 * @param {Object|null} resume -- Active resume for re-scoring
 * @param {Object} [callbacks] -- { onVacancyEnriched, onBatchComplete, onProgress }
 * @returns {Promise<{ fetched: number, failed: number, cached: number, total: number }>}
 */
export async function fetchVacancyDetails(vacancies, resume, callbacks) {
  if (!vacancies || vacancies.length === 0) {
    return { fetched: 0, failed: 0, cached: 0, total: 0 };
  }

  if (isFetching) {
    fetchLog.warn('Fetch already in progress -- skipping');
    return { fetched: 0, failed: 0, cached: 0, total: 0 };
  }

  isFetching = true;
  abortFetch = false;

  const onEnriched = callbacks?.onVacancyEnriched || (() => {});
  const onComplete = callbacks?.onBatchComplete || (() => {});
  const onProgress = callbacks?.onProgress || (() => {});

  try {
    // Step 1: Enrich from cache first (instant)
    const cacheResult = await enrichFromCache(vacancies, resume);

    // Step 2: Identify vacancies that still need fetching
    const storedDetails = await getVacancyDetails();
    const detailMap = new Map();
    for (const d of storedDetails) {
      if (d && d.id) detailMap.set(d.id, d);
    }

    const toFetch = vacancies.filter(v => {
      // Already have key skills from enrichment -- skip
      if (v.keySkills && v.keySkills.length > 0) return false;
      // Have fresh cached detail -- skip
      const cached = detailMap.get(v.id);
      if (cached && isDetailFresh(cached)) return false;
      // Need to fetch
      return true;
    });

    fetchLog.info(
      'Fetch batch: ' + toFetch.length + ' need fetching, ' +
      cacheResult.enriched + ' already from cache, ' +
      (vacancies.length - toFetch.length - cacheResult.enriched) + ' skipped'
    );

    if (toFetch.length === 0) {
      onComplete(vacancies);
      return { fetched: 0, failed: 0, cached: cacheResult.cached, total: vacancies.length };
    }

    // Step 3: Sort by priority -- higher initial scores first
    // (more likely to be relevant, so enrich them first)
    toFetch.sort((a, b) => {
      const sa = a.matchScore != null ? a.matchScore : -1;
      const sb = b.matchScore != null ? b.matchScore : -1;
      return sb - sa;
    });

    // Limit batch size
    const batch = toFetch.slice(0, MAX_FETCH_PER_BATCH);

    let fetched = 0;
    let failed = 0;

    // Step 4: Fetch each vacancy with rate limiting
    for (let i = 0; i < batch.length; i++) {
      if (abortFetch) {
        fetchLog.info('Fetch aborted after ' + fetched + ' vacancies');
        break;
      }

      const vacancy = batch[i];
      onProgress(i + 1, batch.length, vacancy.title);

      let detail = null;

      // Strategy 1: iframe fetch (full JS rendering)
      try {
        detail = await fetchVacancyViaIframe(vacancy.url);
      } catch (err) {
        fetchLog.warn('Iframe failed for ' + vacancy.id + ': ' + err.message);
      }

      // Strategy 2: text fetch fallback (no JS rendering)
      if (!detail) {
        try {
          detail = await fetchVacancyViaText(vacancy.url);
        } catch (err) {
          fetchLog.warn('Text fetch failed for ' + vacancy.id + ': ' + err.message);
        }
      }

      if (detail) {
        // Save detail to storage
        saveVacancyDetail(detail).catch(() => {});

        // Enrich the shallow vacancy
        enrichVacancy(vacancy, detail, resume);

        // Save score to storage
        if (vacancy.matchScore != null) {
          saveVacancyScore(vacancy.id, vacancy.matchScore, vacancy.matchBreakdown, vacancy.matchDetails)
            .catch(() => {});
        }

        fetched++;
        onEnriched(vacancy, detail);
      } else {
        failed++;
      }

      // Rate limit: wait between fetches (except after the last one)
      if (i < batch.length - 1 && !abortFetch) {
        await gaussianDelay(FETCH_DELAY_MIN, FETCH_DELAY_MAX);
      }
    }

    fetchLog.info(
      'Batch complete: ' + fetched + ' fetched, ' + failed + ' failed, ' +
      cacheResult.cached + ' from cache, ' + vacancies.length + ' total'
    );

    onComplete(vacancies);
    return { fetched, failed, cached: cacheResult.cached, total: vacancies.length };
  } catch (err) {
    fetchLog.error('Fatal error in fetch batch: ' + err.message);
    return { fetched: 0, failed: 0, cached: 0, total: vacancies.length };
  } finally {
    isFetching = false;
    abortFetch = false;
  }
}

/**
 * Abort the current fetch batch.
 * Already-fetched results are preserved.
 */
export function abortVacancyFetch() {
  if (isFetching) {
    fetchLog.info('Abort requested');
    abortFetch = true;
  }
}

/**
 * Check if a fetch batch is currently running.
 * @returns {boolean}
 */
export function isVacancyFetching() {
  return isFetching;
}
