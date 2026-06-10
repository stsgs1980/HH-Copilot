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
import { VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE } from './resume-constants.js';

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

  try {
    const list = await fetchResumeList();
    if (list.length === 0) {
      fetchLog.warn('syncAllResumes: no resumes found');
      if (onComplete) onComplete([]);
      return [];
    }

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
      } catch (err) {
        fetchLog.error('Failed: ' + item.url + ': ' + err.message);
        if (onError) onError(item, err);
      }

      if (i < list.length - 1) await gaussianDelay(2000, 5000);
    }

    // ═══ FINAL FALLBACK: UNKNOWN → VISIBLE ═══
    // Only after BOTH list and detail page detection have been tried.
    // If a resume is still UNKNOWN (no hidden indicators found anywhere),
    // it's reasonable to assume it's visible.
    const stillUnknown = results.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      fetchLog.info('Final fallback: ' + stillUnknown.length + ' resumes still UNKNOWN after all detection → defaulting to VISIBLE');
      stillUnknown.forEach(r => {
        r.visibility = VISIBILITY_VISIBLE;
        r.hidden = false;
      });
    }

    fetchLog.info('Done. ' + results.length + '/' + list.length + ' parsed');
    if (onProgress) onProgress(list.length, list.length, 'Готово');
    if (onComplete) onComplete(results);
    return results;
  } catch (err) {
    fetchLog.error('Fatal: ' + err.message);
    if (onError) onError(null, err);
    throw err;
  }
}
