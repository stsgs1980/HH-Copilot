/**
 * CONTENT: VACANCY HELPERS
 * =================================================
 * Helpers extracted from main-page-handlers-vacancy.js (AHG Rule 12).
 * - VOTD relevance filtering (title similarity)
 * - Background vacancy enrichment (iframe/text fetch)
 *
 * v1.9.43.1
 */

import { createLogger } from "../lib/anti-hallucination.js";
import { scoreTitle } from "../lib/match-scorer-title.js";
import { fetchVacancyDetails, isVacancyFetching } from "../lib/vacancy-fetch.js";
import { panelState } from "../ui/panel.js";
import { renderVacancyList } from "../ui/tabs/vacancies.js";

const helperLog = createLogger("Main");

export const VOTD_TITLE_SIMILARITY_THRESHOLD = 0.3;

/**
 * Filter VOTD vacancies by title similarity to resume.
 * VOTD is paid advertising -- only show if potentially relevant.
 *
 * v1.9.37.0
 */
export function filterVotdByRelevance(votd, resume) {
  if (!resume || !resume.title) return votd;
  return votd.filter((v) => {
    const titleResult = scoreTitle(resume, v);
    const isRelevant = titleResult.similarity >= VOTD_TITLE_SIMILARITY_THRESHOLD;
    if (!isRelevant) {
      helperLog.info(
        'VOTD filtered out: "' +
          v.title +
          '" similarity=' +
          titleResult.similarity.toFixed(2) +
          " < " +
          VOTD_TITLE_SIMILARITY_THRESHOLD,
      );
    }
    return isRelevant;
  });
}

/**
 * Start background enrichment of vacancies via iframe/text fetch.
 * Each enriched vacancy triggers a UI re-render with updated score.
 * Runs as fire-and-forget -- errors are logged but not thrown.
 *
 * @param {Object[]} vacancies -- Shallow vacancy objects to enrich
 */
export function startBackgroundEnrichment(vacancies) {
  if (!vacancies || vacancies.length === 0) return;

  if (isVacancyFetching()) {
    helperLog.info("Background enrichment already in progress -- skipping");
    return;
  }

  fetchVacancyDetails(vacancies, panelState.resume, {
    onVacancyEnriched(vacancy) {
      try {
        renderVacancyList();
        helperLog.info(
          'UI updated after enrichment: "' + vacancy.title.substring(0, 30) + '" -> ' + vacancy.matchScore + "%",
        );
      } catch (_e) {
        helperLog.warn("UI update after enrichment failed");
      }
    },
    onBatchComplete() {
      helperLog.info("Background enrichment batch complete");
    },
    onProgress(current, total, title) {
      helperLog.info("Enriching " + current + "/" + total + ": " + title.substring(0, 40));
    },
  }).catch((_e) => {
    helperLog.error("Background enrichment error");
  });
}
