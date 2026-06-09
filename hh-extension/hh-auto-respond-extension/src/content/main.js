/**
 * MAIN: BOOT SEQUENCE
 * =====================
 * Entry point for the bundled content script.
 * Initializes the panel, sets up periodic auth checks, SPA observer,
 * and handles page-specific logic.
 *
 * Auth flow:
 *   init() → createPanel() → updateAuthState every 5s
 *   When auth changes to true → initPageLogic() starts page parsers
 *   When auth changes to false → panel shows "Войдите в hh.ru"
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { checkDailyReset, getStats, getAllSettings } from '../lib/storage.js';
import { parseVacanciesFromPage } from '../parsers/vacancy-list.js';
import { parseResume, parseResumeList, expandHiddenSections, diagnoseResumeDOM, getResumePageType } from '../parsers/resume-detail.js';
import { continueApply } from '../engine/auto-respond.js';
import { panelState, updateAuthState, createPanel, updateVacancies, updateStats, setStatus } from '../ui/panel.js';

const mainLog = createLogger('Main');
let pageInitialized = false;

// Expose diagnoseResumeDOM globally for console access
window.__hhDiagnose = diagnoseResumeDOM;

/**
 * Initialize page-specific logic (parsers, observers).
 * Called ONCE when auth state changes from false/null to true.
 */
export function initPageLogic() {
  if (pageInitialized) return;
  pageInitialized = true;
  mainLog.info('User logged in — initializing page logic');

  const path = window.location.pathname;
  mainLog.info('Page: ' + path);

  if (path.startsWith('/search/vacancy')) {
    const vacancies = parseVacanciesFromPage();
    updateVacancies(vacancies);
    const stats = getStats();
    updateStats(stats);

    // SPA observer — debounce mutations to avoid excessive re-parsing
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const fresh = parseVacanciesFromPage();
        updateVacancies(fresh);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    mainLog.info('SPA observer active');

  } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
    // Resume detail page — parse resume
    expandHiddenSections();
    const resume = parseResume();
    if (resume.id) {
      panelState.resume = resume;
      chrome.storage.local.set({ myResume: resume });
      mainLog.info('Auto-parsed resume: ' + resume.title);
    }

  } else if (path.startsWith('/applicant/resumes')) {
    // Resume list page
    const resumeList = parseResumeList();
    panelState.resumeList = resumeList;
    mainLog.info('Resume list page: ' + resumeList.length + ' resumes');

  } else if (/^\/vacancy\/\d+/.test(path)) {
    // VACANCY DETAIL PAGE — check for pending apply queue
    mainLog.info('Vacancy detail page detected');
    try {
      chrome.storage.local.get('applyQueue', (data) => {
        const queue = data.applyQueue || [];
        if (queue.length > 0) {
          const vacancyId = path.replace('/vacancy/', '').split('?')[0].split('#')[0];
          const pending = queue.find(q => q.vacancyId === vacancyId);
          if (pending) {
            const updatedQueue = queue.filter(q => q.vacancyId !== vacancyId);
            chrome.storage.local.set({ applyQueue: updatedQueue });
            mainLog.info('Processing apply for vacancy ' + vacancyId);
            setTimeout(async () => {
              await continueApply(pending);
            }, 2000);
          } else {
            mainLog.info('Queue has items but none for current vacancy (' + vacancyId + ')');
          }
        } else {
          mainLog.info('No apply queue');
        }
      });
    } catch (e) {
      mainLog.error('Error processing apply queue: ' + e.message);
    }
  }
}

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

  // Load saved resume from storage
  try {
    const d = await chrome.storage.local.get('myResume');
    if (d.myResume && d.myResume.id) {
      panelState.resume = d.myResume;
      mainLog.info('Loaded saved resume: ' + d.myResume.title);
    }
  } catch (e) {}

  // Auth state is managed by createPanel's periodic updateAuthState (every 5s)
  // When auth changes to true, updateAuthState calls initPageLogic

  // Events
  window.addEventListener('hh-ar-apply', async (e) => {
    if (!panelState.isLoggedIn) return;
    const { applyToVacancy } = await import('../engine/auto-respond.js');
    await applyToVacancy(e.detail.vacancyId);
  });

  window.addEventListener('hh-ar-apply-all', async () => {
    if (!panelState.isLoggedIn) return;
    const { applyToAll } = await import('../engine/auto-respond.js');
    await applyToAll(panelState.vacancies);
  });

  window.addEventListener('hh-ar-refresh', async () => {
    if (!panelState.isLoggedIn) return;
    const v = await parseVacanciesFromPage();
    updateVacancies(v);
  });

  // Resume events
  window.addEventListener('hh-ar-load-resume', async () => {
    if (!panelState.isLoggedIn) return;
    const path = window.location.pathname;

    if (/\/resume\/[a-f0-9]+/.test(path)) {
      await expandHiddenSections();
      const resume = parseResume();
      if (resume.id) {
        panelState.resume = resume;
        await chrome.storage.local.set({ myResume: resume });
        mainLog.info('Resume loaded and saved: ' + resume.title);
      } else {
        mainLog.warn('Could not parse resume from current page (no id)');
      }
    } else if (path.includes('/applicant/resumes')) {
      const list = parseResumeList();
      if (list.length > 0) {
        panelState.resumeList = list;
        mainLog.info('Resume list loaded: ' + list.length + ' resumes');
      } else {
        mainLog.warn('No resumes found on list page');
      }
    } else {
      mainLog.warn('Cannot parse resume from this page (' + path + '). Go to /resume/{hash} or /applicant/resumes');
    }
  });
}

// BOOT
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
