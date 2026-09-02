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
 *   - Max 50 concurrent per batch
 *   - Priority: vacancies with higher initial score first
 *   - Stale cache check: skip if detail was parsed < 24h ago
 *
 * Batch helpers extracted to vacancy-fetch-batch.js (AHG Rule 12).
 * v1.9.29.0
 */

import { createLogger } from "./anti-hallucination.js";
import { getVacancyDetails } from "./storage-vacancies.js";
import {
  MAX_FETCH_PER_BATCH,
  buildDetailMap,
  executeBatch,
  filterVacanciesToFetch,
  sortVacanciesByScore,
} from "./vacancy-fetch-batch.js";
import { enrichVacanciesFromCache } from "./vacancy-fetch-enrichment.js";

const fetchLog = createLogger("VacFetch");

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
    fetchLog.info("Cache enrichment: " + result.enriched + "/" + vacancies.length + " vacancies enriched");
    return result;
  } catch (err) {
    fetchLog.warn("Cache enrichment failed: " + err.message);
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
    fetchLog.warn("Fetch already in progress -- skipping");
    return { fetched: 0, failed: 0, cached: 0, total: 0 };
  }

  isFetching = true;
  abortFetch = false;

  const onComplete = callbacks?.onBatchComplete || (() => {});

  try {
    const cacheResult = await enrichFromCache(vacancies, resume);

    const storedDetails = await getVacancyDetails();
    const detailMap = buildDetailMap(storedDetails);
    const toFetch = filterVacanciesToFetch(vacancies, detailMap);

    fetchLog.info(
      "Fetch batch: " +
        toFetch.length +
        " need fetching, " +
        cacheResult.enriched +
        " already from cache, " +
        (vacancies.length - toFetch.length - cacheResult.enriched) +
        " skipped",
    );

    if (toFetch.length === 0) {
      onComplete(vacancies);
      return { fetched: 0, failed: 0, cached: cacheResult.cached, total: vacancies.length };
    }

    sortVacanciesByScore(toFetch);
    const batch = toFetch.slice(0, MAX_FETCH_PER_BATCH);

    const { fetched, failed } = await executeBatch(batch, resume, callbacks, () => abortFetch);

    fetchLog.info(
      "Batch complete: " +
        fetched +
        " fetched, " +
        failed +
        " failed, " +
        cacheResult.cached +
        " from cache, " +
        vacancies.length +
        " total",
    );

    onComplete(vacancies);
    return { fetched, failed, cached: cacheResult.cached, total: vacancies.length };
  } catch (err) {
    fetchLog.error("Fatal error in fetch batch: " + err.message);
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
    fetchLog.info("Abort requested");
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
