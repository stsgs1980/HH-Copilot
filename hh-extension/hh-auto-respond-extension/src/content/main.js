/**
 * MAIN: BOOT SEQUENCE
 * =====================
 * Entry point for the bundled content script.
 * Thin orchestrator — delegates to focused modules:
 *   - main-page-handlers.js — URL-based page initialization
 *   - main-resume-loader.js — hh-ar-load-resume event handler
 *   - main-sync.js          — hh-ar-sync-resumes event handler
 *
 * Auth flow:
 *   init() -> createPanel() -> updateAuthState every 5s
 *   When auth changes to true -> initPageLogic() starts page parsers
 *   When auth changes to false -> panel shows "Log in to hh.ru"
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { checkDailyReset, getStats, getAllSettings, getMyResumes, getActiveResume, setActiveResume, saveMyResumes } from '../lib/storage.js';
import { parseVacanciesFromPage } from '../parsers/vacancy-list.js';
import { diagnoseResumeDOM, debugVisibility } from '../parsers/resume-detail.js';
import { diagnoseVacancyPage } from '../parsers/vacancy-diagnostic.js';
import { parseVacancyDetail } from '../parsers/vacancy-detail.js';
import { computeMatchScore } from '../lib/match-scorer.js';
import { saveVacancyScore, saveVacancyDetail } from '../lib/storage.js';
import { panelState, updateAuthState, createPanel, updateVacancies } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { VISIBILITY_UNKNOWN, TITLE_SUFFIX_NOISE } from '../lib/resume-constants.js';
import { setActiveResumeState, setMyResumes, updateStats, updateSettings } from '../ui/state.js';

// Split modules
import { initPageLogic } from './main-page-handlers.js';
import { handleLoadResume, handleReparseResume } from './main-resume-loader.js';
import { handleSyncResumes } from './main-sync.js';

// Re-export for dynamic import from panel (ui/panel/index.js)
export { initPageLogic };

const mainLog = createLogger('Main');

// Expose diagnostic functions globally for console access
// NOTE: Content scripts run in an isolated world — window.X set here is NOT
// visible from the page's console. Console helpers (__hhVis, __hhVisTable)
// are now provided by page-world.js (Manifest V3 "world": "MAIN" script).
window.__hhDiagnose = diagnoseResumeDOM;
window.__hhDebugVisibility = debugVisibility;

// Initialize visibility diagnostic dump (will be populated after sync)
window.__hhVisDiag = null;

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

async function init() {
  mainLog.info('Loaded: ' + window.location.href);
  await checkDailyReset();

  // Load stats + settings into panelState at boot
  try {
    const [stats, settings] = await Promise.all([getStats(), getAllSettings()]);
    updateStats(stats);
    updateSettings(settings);
    mainLog.info('Boot: stats + settings loaded from storage');
  } catch (e) {
    mainLog.warn('Boot: failed to load stats/settings: ' + e.message);
  }

  createPanel();

  // Load saved resumes from storage + migrate old data
  await loadSavedResumes();

  // Auth state is managed by createPanel's periodic updateAuthState (every 5s)
  // When auth changes to true, updateAuthState calls initPageLogic

  // ── Event listeners ──
  window.addEventListener('hh-ar-apply', async (e) => {
    if (!panelState.isLoggedIn) return;
    const { applyToVacancy } = await import('../engine/index.js');
    await applyToVacancy(e.detail.vacancyId);
  });

  window.addEventListener('hh-ar-apply-all', async () => {
    if (!panelState.isLoggedIn) return;
    const { applyToAll } = await import('../engine/index.js');
    await applyToAll(panelState.vacancies);
  });

  window.addEventListener('hh-ar-refresh', async () => {
    if (!panelState.isLoggedIn) return;
    const v = await parseVacanciesFromPage(panelState.resume);
    updateVacancies(v);
  });

  window.addEventListener('hh-ar-load-resume', handleLoadResume);
  window.addEventListener('hh-ar-reparse-resume', handleReparseResume);
  window.addEventListener('hh-ar-sync-resumes', handleSyncResumes);

  // ── Vacancy diagnostic: listen for manual trigger from page-world.js ──
  // page-world __hhVacDiag() dispatches a DOM CustomEvent which crosses
  // the isolated-world boundary. Content script handles it and runs
  // diagnoseVacancyPage(), then sends data back via postMessage.
  document.addEventListener('HH-AR-RUN-VAC-DIAG', () => {
    try {
      const result = diagnoseVacancyPage();
      mainLog.info('Manual vac diag: ' + (result.vacancyId || 'no id'));
    } catch (e) {
      mainLog.warn('Manual vac diag failed: ' + e.message);
    }
  });

  // Auto-run vacancy diagnostic if we're on a vacancy detail page
  if (/^\/vacancy\/\d+/.test(window.location.pathname)) {
    setTimeout(() => {
      try { diagnoseVacancyPage(); } catch (e) {}
    }, 2000);
  }

  // ── Listen for init-page-logic event from panel (replaces dynamic import) ──
  // panel/index.js dispatches 'hh-ar-init-page-logic' when auth changes to true.
  // This avoids dynamic import() which doesn't work in esbuild IIFE bundles.
  window.addEventListener('hh-ar-init-page-logic', () => {
    mainLog.info('Received hh-ar-init-page-logic event → calling initPageLogic()');
    initPageLogic();
  });

  // ── Safety net: auto-init page logic on vacancy detail pages ──
  // If auth was already detected before the panel dispatched the event
  // (e.g. fast page loads), we also try after a delay.
  if (/^\/vacancy\/\d+/.test(window.location.pathname)) {
    setTimeout(() => {
      // initPageLogic is idempotent — it checks lastHandledPath to avoid duplicates
      initPageLogic();
    }, 3000);
  }

  // ── Re-score vacancy detail when resume becomes available ──
  // On vacancy detail pages, the first scoring may show skills=0 because
  // the resume hasn't been loaded from storage yet. When a resume loads
  // (either from storage at boot, or from a page parse), we re-score.
  window.addEventListener('hh-ar-resume-loaded', (e) => {
    const resume = e.detail?.resume || panelState.resume;
    if (!resume) return;
    if (!/^\/vacancy\/\d+/.test(window.location.pathname)) return;
    mainLog.info('Resume loaded — re-scoring vacancy detail page');
    try {
      const detail = parseVacancyDetail();
      if (detail) {
        const score = computeMatchScore(resume, detail);
        detail.matchScore = score.total;
        detail.matchBreakdown = score.breakdown;
        mainLog.info('Re-score: ' + score.total + '% (skills=' + score.breakdown.skills + ', title=' + score.breakdown.title + ', salary=' + score.breakdown.salary + ', exp=' + score.breakdown.experience + ')');
        saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {});
        saveVacancyDetail(detail).catch(() => {});
        window.__hhVacDetail = detail;
        // Notify panel to update match display
        window.dispatchEvent(new CustomEvent('hh-ar-match-updated', { detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details } }));
      }
    } catch (err) {
      mainLog.warn('Re-score failed: ' + err.message);
    }
  });
}

/**
 * Load saved resumes from chrome.storage and migrate old data formats.
 */
async function loadSavedResumes() {
  try {
    const savedResume = await getActiveResume();
    if (savedResume && savedResume.id) {
      // Migrate old data: backfill visibility, clean title
      if (savedResume.visibility === undefined) {
        savedResume.visibility = savedResume.hidden ? 'hidden' : VISIBILITY_UNKNOWN;
        await setActiveResume(savedResume);
      }
      if (savedResume.title && TITLE_SUFFIX_NOISE.test(savedResume.title)) {
        savedResume.title = savedResume.title.replace(TITLE_SUFFIX_NOISE, '').trim();
        await setActiveResume(savedResume);
      }
      setActiveResumeState(savedResume);
      mainLog.info('Loaded saved resume: ' + savedResume.title);
      // Notify listeners (e.g. vacancy detail re-score) that resume is available
      window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume: savedResume } }));
    }
  } catch (e) {}

  try {
    setMyResumes(await getMyResumes());
    if (panelState.myResumes.length > 0) {
      mainLog.info('Loaded ' + panelState.myResumes.length + ' saved resumes');
      // Migrate old data: backfill visibility field, clean title noise
      let needsSave = false;
      panelState.myResumes.forEach(r => {
        if (r.visibility === undefined) {
          r.visibility = r.hidden ? 'hidden' : VISIBILITY_UNKNOWN;
          needsSave = true;
        }
        if (r.title && TITLE_SUFFIX_NOISE.test(r.title)) {
          r.title = r.title.replace(TITLE_SUFFIX_NOISE, '').trim();
          needsSave = true;
        }
      });
      if (needsSave) {
        await saveMyResumes(panelState.myResumes);
        mainLog.info('Migrated resume data: added visibility, cleaned titles');
      }
      renderMyResumesPanel();
    }
  } catch (e) {}
}

// BOOT
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
