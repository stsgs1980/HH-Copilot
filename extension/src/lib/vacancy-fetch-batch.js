/**
 * LIB: VACANCY FETCH BATCH
 * ==========================
 * Batch helpers extracted from vacancy-fetch.js (AHG Rule 12).
 * Contains constants, filtering, sorting, fallback fetch, and
 * the batch execution loop.
 */

import { createLogger } from "./anti-hallucination.js";
import { saveVacancyDetail, saveVacancyScore } from "./storage-vacancies.js";
import { gaussianDelay } from "./timing.js";
import { enrichVacancy, isDetailFresh } from "./vacancy-fetch-enrichment.js";
import { fetchVacancyViaIframe } from "./vacancy-fetch-iframe.js";
import { fetchVacancyViaText } from "./vacancy-fetch-text.js";

const batchLog = createLogger("VacFetch");

export const MAX_FETCH_PER_BATCH = 50;
export const FETCH_DELAY_MIN = 1500;
export const FETCH_DELAY_MAX = 3500;

export function buildDetailMap(storedDetails) {
  const detailMap = new Map();
  for (const d of storedDetails) {
    if (d && d.id) detailMap.set(d.id, d);
  }
  return detailMap;
}

export function filterVacanciesToFetch(vacancies, detailMap) {
  return vacancies.filter((v) => {
    if (v.keySkills && v.keySkills.length > 0) return false;
    const cached = detailMap.get(v.id);
    if (cached && isDetailFresh(cached)) return false;
    return true;
  });
}

export function sortVacanciesByScore(vacancies) {
  vacancies.sort((a, b) => {
    const sa = a.matchScore != null ? a.matchScore : -1;
    const sb = b.matchScore != null ? b.matchScore : -1;
    return sb - sa;
  });
}

export async function fetchWithFallback(url, vacancyId) {
  let detail = null;
  try {
    detail = await fetchVacancyViaIframe(url);
  } catch (err) {
    batchLog.warn("Iframe failed for " + vacancyId + ": " + err.message);
  }
  if (!detail) {
    try {
      detail = await fetchVacancyViaText(url);
    } catch (err) {
      batchLog.warn("Text fetch failed for " + vacancyId + ": " + err.message);
    }
  }
  return detail;
}

export async function executeBatch(batch, resume, callbacks, isAborted) {
  const onEnriched = callbacks?.onVacancyEnriched || (() => {});
  const onProgress = callbacks?.onProgress || (() => {});

  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    if (isAborted && isAborted()) {
      batchLog.info("Fetch aborted after " + fetched + " vacancies");
      break;
    }

    const vacancy = batch[i];
    onProgress(i + 1, batch.length, vacancy.title);

    const detail = await fetchWithFallback(vacancy.url, vacancy.id);

    if (detail) {
      saveVacancyDetail(detail).catch(() => {});
      await enrichVacancy(vacancy, detail, resume);
      if (vacancy.matchScore != null) {
        saveVacancyScore(vacancy.id, vacancy.matchScore, vacancy.matchBreakdown, vacancy.matchDetails).catch(() => {});
      }
      fetched++;
      onEnriched(vacancy, detail);
    } else {
      failed++;
    }

    if (i < batch.length - 1 && !(isAborted && isAborted())) {
      await gaussianDelay(FETCH_DELAY_MIN, FETCH_DELAY_MAX);
    }
  }

  return { fetched, failed };
}
