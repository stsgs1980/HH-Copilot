/**
 * CONTENT: PAGE HANDLERS -- VACANCY & MAIN PAGE
 * =================================================
 * Handlers for vacancy search, vacancy detail, and main page (/).
 * Includes background enrichment and VOTD relevance filtering.
 *
 * Split from main-page-handlers-pages.js (AHG Rule 12).
 * v1.9.43.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getStats, saveVacancyDetail, saveVacancyScore, getApplyQueue, setApplyQueue } from '../lib/storage.js';
import { parseVacanciesFromPage, parseVacanciesOfTheDay } from '../parsers/vacancy-list.js';
import { scoreTitle } from '../lib/match-scorer-title.js';
import { diagnoseVacancyPage } from '../parsers/vacancy-diagnostic.js';
import { parseVacancyDetail } from '../parsers/vacancy-detail.js';
import { enrichFromCache, fetchVacancyDetails, abortVacancyFetch, isVacancyFetching } from '../lib/vacancy-fetch.js';
import { continueApply } from '../engine/index.js';
import { computeMatchScore } from '../lib/match-scorer.js';
import { panelState, updateVacancies, updateStats } from '../ui/panel.js';
import { renderVacancyList } from '../ui/tabs/vacancies.js';

const pageLog = createLogger('Main');

// -- Vacancy search page --

let searchObserverActive = false;

/**
 * Handle /search/vacancy page: parse cards, enrich from cache, kick off
 * background deep enrichment, and observe SPA mutations.
 */
export async function handleVacancySearchPage() {
  const vacancies = await parseVacanciesFromPage(panelState.resume);

  // Step 1: Enrich from cache (instant -- no network)
  await enrichFromCache(vacancies, panelState.resume);
  updateVacancies(vacancies);

  const stats = getStats();
  updateStats(stats);

  // Step 2: Background deep fetch for vacancies without keySkills
  startBackgroundEnrichment(vacancies);

  // Set up SPA MutationObserver only once
  if (!searchObserverActive) {
    searchObserverActive = true;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!window.location.pathname.startsWith('/search/vacancy')) return;
        abortVacancyFetch();
        const fresh = await parseVacanciesFromPage(panelState.resume);
        await enrichFromCache(fresh, panelState.resume);
        updateVacancies(fresh);
        startBackgroundEnrichment(fresh);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('SPA observer active');
  }
}

// -- Vacancy detail page --

/**
 * Handle /vacancy/{id} page: run diagnostic, parse detail, compute match
 * score, persist to storage, and process pending apply queue items.
 *
 * @param {string} path -- current pathname
 */
export async function handleVacancyDetailPage(path) {
  pageLog.info('Vacancy detail page detected');

  // Run vacancy page diagnostic
  try {
    const diag = diagnoseVacancyPage();
    const fieldCount = Object.keys(diag.autoDetect || {})
      .filter(k => diag.autoDetect[k] && (diag.autoDetect[k].value || diag.autoDetect[k].found))
      .length;
    pageLog.info('Vacancy diagnostic: ' + fieldCount + ' fields detected');
  } catch (_e) {
    pageLog.warn('Vacancy diagnostic failed');
  }

  // Parse vacancy detail
  try {
    const detail = parseVacancyDetail();
    if (detail) {
      const resume = panelState.resume;
      if (resume) {
        const score = computeMatchScore(resume, detail);
        detail.matchScore = score.total;
        detail.matchBreakdown = score.breakdown;
        pageLog.info('Match score: ' + score.total + '% (skills=' + score.breakdown.skills + ', title=' + score.breakdown.title + ', salary=' + score.breakdown.salary + ', exp=' + score.breakdown.experience + ')');
        saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {});
        window.dispatchEvent(new CustomEvent('hh-ar-match-updated', { detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details } }));
      } else {
        pageLog.info('No active resume -- skip match scoring');
      }
      pageLog.info('Vacancy parsed: ' + detail.title + ' | skills=' + detail.keySkills.length + ' | salary=' + detail.salary.raw);
      window.__hhVacDetail = detail;
      saveVacancyDetail(detail).catch(() => {});
    } else {
      pageLog.warn('Vacancy detail parse returned null');
    }
  } catch (_e) {
    pageLog.error('Vacancy detail parse failed');
  }

  // Process apply queue
  try {
    const queue = await getApplyQueue();
    if (queue.length > 0) {
      const vacancyId = path.replace('/vacancy/', '').split('?')[0].split('#')[0];
      const pending = queue.find(q => q.vacancyId === vacancyId);
      if (pending) {
        const updatedQueue = queue.filter(q => q.vacancyId !== vacancyId);
        await setApplyQueue(updatedQueue);
        pageLog.info('Processing apply for vacancy ' + vacancyId);
        setTimeout(async () => {
          await continueApply(pending);
        }, 2000);
      } else {
        pageLog.info('Queue has items but none for current vacancy (' + vacancyId + ')');
      }
    } else {
      pageLog.info('No apply queue');
    }
  } catch (_e) {
    pageLog.error('Error processing apply queue');
  }
}

// -- Main page (/) --

let mainPageObserverActive = false;

// v1.9.37.0: Title similarity threshold for VOTD pre-filter.
const VOTD_TITLE_SIMILARITY_THRESHOLD = 0.3;

/**
 * Filter VOTD vacancies by title similarity to resume.
 * VOTD is paid advertising -- only show if potentially relevant.
 *
 * v1.9.37.0
 */
function filterVotdByRelevance(votd, resume) {
  if (!resume || !resume.title) return votd;
  return votd.filter(v => {
    const titleResult = scoreTitle(resume, v);
    const isRelevant = titleResult.similarity >= VOTD_TITLE_SIMILARITY_THRESHOLD;
    if (!isRelevant) {
      pageLog.info('VOTD filtered out: "' + v.title + '" similarity=' +
        titleResult.similarity.toFixed(2) + ' < ' + VOTD_TITLE_SIMILARITY_THRESHOLD);
    }
    return isRelevant;
  });
}

/**
 * Handle main page (/): parse recommended vacancies + VOTD, filter VOTD
 * by relevance, enrich from cache, kick off background enrichment,
 * and observe SPA mutations.
 */
export async function handleMainPage() {
  pageLog.info('Main page detected -- parsing recommended vacancies + "Vacancy of the Day"');

  const recommended = await parseVacanciesFromPage(panelState.resume);
  const rawVotd = await parseVacanciesOfTheDay(panelState.resume);

  const votd = filterVotdByRelevance(rawVotd, panelState.resume);
  const allVacancies = [...recommended, ...votd];

  await enrichFromCache(allVacancies, panelState.resume);
  updateVacancies(allVacancies);
  const stats = getStats();
  updateStats(stats);

  pageLog.info('Main page: ' + recommended.length + ' recommended + ' + votd.length + '/' + rawVotd.length + ' VotD (filtered) = ' + allVacancies.length + ' total');

  startBackgroundEnrichment(allVacancies);

  if (!mainPageObserverActive) {
    mainPageObserverActive = true;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (window.location.pathname !== '/' && window.location.pathname !== '') return;
        abortVacancyFetch();
        const rec = await parseVacanciesFromPage(panelState.resume);
        const rawVd = await parseVacanciesOfTheDay(panelState.resume);
        const vd = filterVotdByRelevance(rawVd, panelState.resume);
        const fresh = [...rec, ...vd];
        await enrichFromCache(fresh, panelState.resume);
        updateVacancies(fresh);
        startBackgroundEnrichment(fresh);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('Main page SPA observer active');
  }
}

// -- Helper --

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
    pageLog.info('Background enrichment already in progress -- skipping');
    return;
  }

  fetchVacancyDetails(vacancies, panelState.resume, {
    onVacancyEnriched(vacancy) {
      try {
        renderVacancyList();
        pageLog.info('UI updated after enrichment: "' + vacancy.title.substring(0, 30) + '" -> ' + vacancy.matchScore + '%');
      } catch (_e) {
        pageLog.warn('UI update after enrichment failed');
      }
    },
    onBatchComplete() {
      pageLog.info('Background enrichment batch complete');
    },
    onProgress(current, total, title) {
      pageLog.info('Enriching ' + current + '/' + total + ': ' + title.substring(0, 40));
    }
  }).catch(_e => {
    pageLog.error('Background enrichment error');
  });
}
