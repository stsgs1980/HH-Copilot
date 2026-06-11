/**
 * LIB: RESUME FETCH — Thin orchestrator that re-exports from modular files.
 * Flow: fetchResumeList() -> fetchAndParseResume() -> syncAllResumes()
 *
 * All logic is split into focused modules:
 *   resume-fetch-list.js            — Resume list fetching
 *   resume-fetch-resume.js          — Single resume parsing + experience orchestrator
 *   resume-fetch-experience.js      — Experience Strategies 1-3 (DOM-based)
 *   resume-fetch-strategy4-text.js  — Strategy 4 (text pattern parsing)
 *   resume-fetch-strategy5-scripts.js   — Strategy 5 orchestrator (script JSON parsing)
 *   resume-fetch-strategy5-scanners.js  — Strategy 5 JSON scanners
 *   resume-fetch-strategy6-expand.js    — Strategy 6 orchestrator (iframe/API expansion)
 *   resume-fetch-strategy6-iframe.js    — Strategy 6 iframe sub-strategy
 *   resume-fetch-strategy6-urls.js      — Strategy 6 URL discovery + fetch
 *   resume-fetch-strategy6-api.js       — Strategy 6 applicant API + result parsing
 *   resume-fetch-json-utils.js      — JSON extraction utilities
 *   resume-fetch-education-languages.js — Education & languages parsing
 */

import { createLogger } from './anti-hallucination.js';
import { gaussianDelay } from './timing.js';
import { fetchResumeList } from './resume-fetch-list.js';
import { fetchAndParseResume } from './resume-fetch-resume.js';
import { VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE, VISIBILITY_HIDDEN } from './resume-constants.js';

const fetchLog = createLogger('ResumeFetch');

// Re-export public API
export { fetchResumeList, fetchAndParseResume };

/**
 * Sync all resumes: fetch list → parse each → return results.
 * @param {object} [callbacks] - { onProgress, onComplete, onError }
 * @returns {Array} Parsed resume objects
 */
export async function syncAllResumes({ onProgress, onComplete, onError } = {}) {
  fetchLog.info('syncAllResumes: starting ...');

  // Initialize global visibility diagnostic dump
  const visDiag = {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    listSource: null,
    listRawHtmlLength: 0,
    resumes: [],
    summary: { total: 0, visible: 0, hidden: 0, unknown: 0, unknownFallbackToVisible: 0 }
  };

  try {
    const list = await fetchResumeList();
    visDiag.listSource = 'fetch';
    visDiag.listRawHtmlLength = window.__hhLastFetchHtml?.length || 0;

    if (list.length === 0) {
      fetchLog.warn('syncAllResumes: no resumes found');
      visDiag.summary.total = 0;
      visDiag.finishedAt = new Date().toISOString();
      window.__hhVisDiag = visDiag;
      if (onComplete) onComplete([]);
      return [];
    }

    // Capture list-level visibility data
    list.forEach(item => {
      visDiag.resumes.push({
        id: item.id,
        title: item.title,
        url: item.url,
        listVis: item.visibility,
        listHidden: item.hidden,
        pageVis: null,
        pageTrace: null,
        decision: null,
        decisionReason: null,
        finalVisibility: null
      });
    });

    const visibleCount = list.filter(r => {
      const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
      return vis !== 'hidden';
    }).length;
    const hiddenCount = list.length - visibleCount;
    if (hiddenCount > 0) {
      fetchLog.info('syncAllResumes: ' + visibleCount + ' visible, ' + hiddenCount + ' hidden');
    }

    if (onProgress) onProgress(0, list.length, 'Загрузка списка резюме...');

    const results = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const vis = item.visibility || (item.hidden ? 'hidden' : 'unknown');
      const label = vis === 'hidden' ? 'Парсинг (скрыто): ' : 'Парсинг: ';
      if (onProgress) onProgress(i, list.length, label + item.title);

      try {
        const resume = await fetchAndParseResume(item.url, item);
        // If parseHeader didn't find a title, use the one from the list
        if ((!resume.title || resume.title === '') && resume._listTitle) {
          resume.title = resume._listTitle;
        }
        delete resume._listTitle;
        if (resume.id) results.push(resume);
        else fetchLog.warn('No id for ' + item.url);

        // Merge page-level diagnostic into our global dump
        const diagEntry = visDiag.resumes.find(r => r.id === resume.id);
        if (diagEntry && resume._visDiag) {
          diagEntry.pageVis = resume._visDiag.pageVis;
          diagEntry.pageTrace = resume._visDiag.pageTrace;
          diagEntry.decision = resume._visDiag.decision;
          diagEntry.decisionReason = resume._visDiag.decisionReason;
        }
      } catch (err) {
        fetchLog.error('Failed: ' + item.url + ': ' + err.message);
        if (onError) onError(item, err);
        // Record error in diagnostic
        const diagEntry = visDiag.resumes.find(r => r.id === item.id);
        if (diagEntry) {
          diagEntry.pageVis = 'error';
          diagEntry.pageTrace = ['ERROR: ' + err.message];
          diagEntry.decision = 'error';
          diagEntry.decisionReason = 'fetch-failed';
        }
      }

      if (i < list.length - 1) await gaussianDelay(2000, 5000);
    }

    // ═══ FINAL FALLBACK: UNKNOWN → VISIBLE ═══
    // Only after BOTH list and detail page detection have been tried.
    // If a resume is still UNKNOWN (no hidden indicators found anywhere),
    // it's reasonable to assume it's visible.
    const stillUnknown = results.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      fetchLog.info('[VIS-DIAG] Final fallback: ' + stillUnknown.length + ' resumes still UNKNOWN after all detection → defaulting to VISIBLE');
      visDiag.summary.unknownFallbackToVisible = stillUnknown.length;
      stillUnknown.forEach(r => {
        fetchLog.info('[VIS-DIAG]   ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 30) + '" UNKNOWN→VISIBLE');
        r.visibility = VISIBILITY_VISIBLE;
        r.hidden = false;
        // Update diagnostic entry
        const diagEntry = visDiag.resumes.find(d => d.id === r.id);
        if (diagEntry) {
          diagEntry.finalVisibility = VISIBILITY_VISIBLE;
          diagEntry.decisionReason += ' [FALLBACK: UNKNOWN→VISIBLE]';
        }
      });
    }

    // ═══ FINALIZE DIAGNOSTIC: set finalVisibility for all resumes ═══
    results.forEach(r => {
      const diagEntry = visDiag.resumes.find(d => d.id === r.id);
      if (diagEntry && !diagEntry.finalVisibility) {
        diagEntry.finalVisibility = r.visibility;
      }
    });

    // ═══ VISIBILITY SUMMARY ═══
    visDiag.summary.total = results.length;
    visDiag.summary.visible = results.filter(r => r.visibility === VISIBILITY_VISIBLE).length;
    visDiag.summary.hidden = results.filter(r => r.visibility === VISIBILITY_HIDDEN).length;
    visDiag.summary.unknown = results.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
    visDiag.finishedAt = new Date().toISOString();

    fetchLog.info('[VIS-DIAG] ═══ FINAL VISIBILITY SUMMARY ═══');
    fetchLog.info('[VIS-DIAG] Total: ' + visDiag.summary.total +
      ', Visible: ' + visDiag.summary.visible +
      ', Hidden: ' + visDiag.summary.hidden +
      ', Unknown: ' + visDiag.summary.unknown +
      ', Fallbacks: ' + visDiag.summary.unknownFallbackToVisible);
    results.forEach(r => {
      fetchLog.info('[VIS-DIAG]   ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 30) + '" → ' + r.visibility);
    });

    // ═══ EXPOSE GLOBAL DIAGNOSTIC ═══
    // Content scripts run in isolated world — window.X here is NOT visible
    // from the page console. Send data to page-world.js (MAIN world) via postMessage.
    window.__hhVisDiag = visDiag;
    try {
      window.postMessage({ type: 'HH-AR-VISDIAG', payload: visDiag }, '*');
    } catch (e) {
      fetchLog.warn('[VIS-DIAG] Could not send to page world: ' + e.message);
    }
    fetchLog.info('[VIS-DIAG] Diagnostic dump available: __hhVis() / __hhVisTable() / window.__hhVisDiag');

    fetchLog.info('Done. ' + results.length + '/' + list.length + ' parsed');
    if (onProgress) onProgress(list.length, list.length, 'Готово');
    if (onComplete) onComplete(results);
    return results;
  } catch (err) {
    fetchLog.error('Fatal: ' + err.message);
    visDiag.finishedAt = new Date().toISOString();
    visDiag.error = err.message;
    window.__hhVisDiag = visDiag;
    try {
      window.postMessage({ type: 'HH-AR-VISDIAG', payload: visDiag }, '*');
    } catch (e) {}
    if (onError) onError(null, err);
    throw err;
  }
}
