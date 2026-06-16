/**
 * LIB: RESUME FETCH -- Visibility Fallback
 * =========================================
 * Final visibility fallback logic: UNKNOWN -> VISIBLE decision,
 * diagnostic dump finalization, and global diagnostic exposure.
 * Split from resume-fetch.js for anti-monolith compliance.
 */

import { createLogger } from './anti-hallucination.js';
import { VISIBILITY_UNKNOWN, VISIBILITY_VISIBLE } from './resume-constants.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Apply final visibility fallback for resumes still UNKNOWN after all detection.
 * - If iframe was NOT run -> default to VISIBLE (assumed visible)
 * - If iframe ran but returned UNKNOWN -> keep UNKNOWN (genuinely unknown)
 */
export function applyVisibilityFallback(results, visDiag) {
  const stillUnknown = results.filter(r => r.visibility === VISIBILITY_UNKNOWN);
  if (stillUnknown.length === 0) return;

  const iframeRan = stillUnknown.filter(r => r._visDiag?.iframeRan);
  const iframeNotRan = stillUnknown.filter(r => !r._visDiag?.iframeRan);

  if (iframeNotRan.length > 0) {
    fetchLog.info('[VIS-DIAG] Final fallback: ' + iframeNotRan.length + ' resumes UNKNOWN (iframe not run) -> defaulting to VISIBLE');
    visDiag.summary.unknownFallbackToVisible = iframeNotRan.length;
    iframeNotRan.forEach(r => {
      fetchLog.info('[VIS-DIAG]   ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 30) + '" UNKNOWN->VISIBLE (iframe not run)');
      r.visibility = VISIBILITY_VISIBLE;
      r.hidden = false;
      const diagEntry = visDiag.resumes.find(d => d.id === r.id);
      if (diagEntry) {
        diagEntry.finalVisibility = VISIBILITY_VISIBLE;
        diagEntry.decisionReason += ' [FALLBACK: UNKNOWN->VISIBLE, iframe not run]';
      }
    });
  }

  if (iframeRan.length > 0) {
    fetchLog.info('[VIS-DIAG] Keeping UNKNOWN for ' + iframeRan.length + ' resumes (iframe ran but returned UNKNOWN)');
    iframeRan.forEach(r => {
      fetchLog.info('[VIS-DIAG]   ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 30) + '" -> UNKNOWN (iframe ran, no indicators found)');
      const diagEntry = visDiag.resumes.find(d => d.id === r.id);
      if (diagEntry) {
        diagEntry.finalVisibility = VISIBILITY_UNKNOWN;
        diagEntry.decisionReason += ' [KEPT UNKNOWN: iframe ran, no indicators]';
      }
    });
  }
}

/**
 * Finalize visibility diagnostic: set finalVisibility for all resumes,
 * compute summary stats, and expose global diagnostic.
 */
export function finalizeVisDiag(results, visDiag) {
  // Set finalVisibility for all resumes
  results.forEach(r => {
    const diagEntry = visDiag.resumes.find(d => d.id === r.id);
    if (diagEntry && !diagEntry.finalVisibility) {
      diagEntry.finalVisibility = r.visibility;
    }
  });

  // Compute summary
  visDiag.summary.total = results.length;
  visDiag.summary.visible = results.filter(r => r.visibility === VISIBILITY_VISIBLE).length;
  visDiag.summary.hidden = results.filter(r => r.visibility === 'hidden').length;
  visDiag.summary.unknown = results.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
  visDiag.finishedAt = new Date().toISOString();

  fetchLog.info('[VIS-DIAG] === FINAL VISIBILITY SUMMARY ===');
  fetchLog.info('[VIS-DIAG] Total: ' + visDiag.summary.total +
    ', Visible: ' + visDiag.summary.visible +
    ', Hidden: ' + visDiag.summary.hidden +
    ', Unknown: ' + visDiag.summary.unknown +
    ', Fallbacks: ' + visDiag.summary.unknownFallbackToVisible);
  results.forEach(r => {
    fetchLog.info('[VIS-DIAG]   ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 30) + '" -> ' + r.visibility);
  });

  // Expose global diagnostic via window + postMessage
  window.__hhVisDiag = visDiag;
  try {
    window.postMessage({ type: 'HH-AR-VISDIAG', payload: visDiag }, '*');
  } catch (e) {
    fetchLog.warn('[VIS-DIAG] Could not send to page world: ' + e.message);
  }
  fetchLog.info('[VIS-DIAG] Diagnostic dump available: __hhVis() / __hhVisTable() / window.__hhVisDiag');
}
