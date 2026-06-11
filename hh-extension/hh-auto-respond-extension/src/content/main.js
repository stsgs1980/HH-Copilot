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
import { panelState, updateAuthState, createPanel, updateVacancies } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { VISIBILITY_UNKNOWN, TITLE_SUFFIX_NOISE } from '../lib/resume-constants.js';
import { setActiveResumeState, setMyResumes } from '../ui/state.js';

// Split modules
import { initPageLogic } from './main-page-handlers.js';
import { handleLoadResume } from './main-resume-loader.js';
import { handleSyncResumes } from './main-sync.js';

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
    Object.assign(panelState.stats, stats);
    Object.assign(panelState.settings, settings);
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
    const v = await parseVacanciesFromPage();
    updateVacancies(v);
  });

  window.addEventListener('hh-ar-load-resume', handleLoadResume);
  window.addEventListener('hh-ar-sync-resumes', handleSyncResumes);
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
