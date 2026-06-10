/**
 * MAIN: BOOT SEQUENCE
 * =====================
 * Entry point for the bundled content script.
 * Initializes the panel, sets up periodic auth checks, SPA observer,
 * and handles page-specific logic.
 *
 * Auth flow:
 *   init() -> createPanel() -> updateAuthState every 5s
 *   When auth changes to true -> initPageLogic() starts page parsers
 *   When auth changes to false -> panel shows "Log in to hh.ru"
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { checkDailyReset, getStats, getAllSettings, getMyResumes, saveMyResume, clearMyResumes } from '../lib/storage.js';
import { parseVacanciesFromPage } from '../parsers/vacancy-list.js';
import { parseResume, parseResumeList, expandHiddenSections, diagnoseResumeDOM, debugVisibility, getResumePageType } from '../parsers/resume-detail.js';
import { fetchAndParseResume } from '../lib/resume-fetch.js';
import { continueApply } from '../engine/auto-respond.js';
import { panelState, updateAuthState, createPanel, updateVacancies, updateStats, setStatus } from '../ui/panel.js';
import { renderMyResumesPanel, renderResumePanel, renderResumeListPanel } from '../ui/tabs/resumes.js';
import { refs } from '../ui/state.js';
import { syncAllResumes } from '../lib/resume-fetch.js';
import { VISIBILITY_UNKNOWN, TITLE_SUFFIX_NOISE } from '../lib/resume-constants.js';

const mainLog = createLogger('Main');
let pageInitialized = false;
let syncInProgress = false;

// Expose diagnostic functions globally for console access
window.__hhDiagnose = diagnoseResumeDOM;
window.__hhDebugVisibility = debugVisibility;

/**
 * Initialize page-specific logic (parsers, observers).
 * Called ONCE when auth state changes from false/null to true.
 */
export async function initPageLogic() {
  if (pageInitialized) return;
  pageInitialized = true;
  mainLog.info('User logged in -- initializing page logic');

  const path = window.location.pathname;
  mainLog.info('Page: ' + path);

  if (path.startsWith('/search/vacancy')) {
    const vacancies = parseVacanciesFromPage();
    updateVacancies(vacancies);
    const stats = getStats();
    updateStats(stats);

    // SPA observer -- debounce mutations to avoid excessive re-parsing
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
    // Resume detail page -- parse resume
    if (/\/resume\/edit\//.test(path)) {
      // EDIT page: DOM differs from view page, use fetch-based parser instead
      const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
      if (editMatch) {
        const resumeId = editMatch[1];
        const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + resumeId;
        mainLog.info('Edit page detected, fetching view: ' + viewUrl);
        try {
          const resume = await fetchAndParseResume(viewUrl);
          if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
            panelState.resume = resume;
            panelState._resumeCleared = false;
            chrome.storage.local.set({ myResume: resume });
            saveMyResume(resume).then(() => {
              getMyResumes().then(list => {
                panelState.myResumes = list;
                renderMyResumesPanel();
              });
            });
            mainLog.info('Auto-fetched resume (from edit page): ' + resume.title);
          }
        } catch (err) {
          mainLog.warn('Failed to fetch resume from edit page: ' + err.message);
        }
      }
    } else {
      // VIEW page: parse the live DOM directly
      await expandHiddenSections();
      const resume = parseResume();
      if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
        panelState.resume = resume;
        panelState._resumeCleared = false;
        chrome.storage.local.set({ myResume: resume });
        saveMyResume(resume).then(() => {
          getMyResumes().then(list => {
            panelState.myResumes = list;
            renderMyResumesPanel();
          });
        });
        mainLog.info('Auto-parsed resume: ' + resume.title);
      }
    }

  } else if (path.startsWith('/applicant/resumes')) {
    // Resume list page
    const resumeList = parseResumeList();
    panelState.resumeList = resumeList;
    getMyResumes().then(list => {
      panelState.myResumes = list;
      renderMyResumesPanel();
    });
    mainLog.info('Resume list page: ' + resumeList.length + ' resumes');

  } else if (/^\/vacancy\/\d+/.test(path)) {
    // VACANCY DETAIL PAGE -- check for pending apply queue
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

// ═══════════════════════════════════════════════
// SYNC ALL RESUMES (fetch-based, works from ANY page)
// ═══════════════════════════════════════════════

async function handleSyncResumes() {
  if (!panelState.isLoggedIn) return;
  if (syncInProgress) {
    mainLog.warn('Sync already in progress');
    return;
  }
  syncInProgress = true;

  // Update UI: show syncing state
  setStatus('Синхронизация резюме...');
  mainLog.info('Sync: starting fetch-based resume sync');

  try {
    await clearMyResumes();
    panelState.myResumes = [];
    renderMyResumesPanel();

    const results = await syncAllResumes({
      onProgress: (done, total, msg) => {
        mainLog.info('Sync: [' + done + '/' + total + '] ' + msg);
        setStatus('Синхр.: ' + done + '/' + total + ' — ' + msg);
        renderSyncProgress(done, total, msg);
      },
      onError: (item, err) => {
        mainLog.error('Sync: error for ' + (item ? item.title : 'unknown') + ': ' + err.message);
      }
    });

    // Save all parsed resumes to storage
    for (const resume of results) {
      await saveMyResume(resume);
    }

    // Update state and UI
    panelState.myResumes = await getMyResumes();
    renderMyResumesPanel();

    if (results.length > 0) {
      panelState.resume = results[0];
      panelState._resumeCleared = false;
      await chrome.storage.local.set({ myResume: results[0] });
      renderResumePanel();
    }

    setStatus('Синхронизировано ' + results.length + ' резюме');
    mainLog.info('Sync: complete. ' + results.length + ' resumes saved');

  } catch (err) {
    mainLog.error('Sync: fatal error: ' + err.message);
    setStatus('Ошибка синхронизации: ' + err.message);
  } finally {
    syncInProgress = false;
    // Signal completion for button loading state
    window.dispatchEvent(new CustomEvent('hh-ar-sync-done'));
  }
}

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

  // Load saved resumes from storage
  try {
    const d = await chrome.storage.local.get('myResume');
    if (d.myResume && d.myResume.id) {
      // Migrate old data: backfill visibility, clean title
      if (d.myResume.visibility === undefined) {
        d.myResume.visibility = d.myResume.hidden ? 'hidden' : VISIBILITY_UNKNOWN;
        await chrome.storage.local.set({ myResume: d.myResume });
      }
      if (d.myResume.title && TITLE_SUFFIX_NOISE.test(d.myResume.title)) {
        d.myResume.title = d.myResume.title.replace(TITLE_SUFFIX_NOISE, '').trim();
        await chrome.storage.local.set({ myResume: d.myResume });
      }
      panelState.resume = d.myResume;
      mainLog.info('Loaded saved resume: ' + d.myResume.title);
    }
  } catch (e) {}

  try {
    panelState.myResumes = await getMyResumes();
    if (panelState.myResumes.length > 0) {
      mainLog.info('Loaded ' + panelState.myResumes.length + ' saved resumes');
      // Migrate old data: backfill visibility field, clean title noise
      let needsSave = false;
      panelState.myResumes.forEach(r => {
        // Backfill visibility for resumes saved before v1.7.8
        if (r.visibility === undefined) {
          r.visibility = r.hidden ? 'hidden' : VISIBILITY_UNKNOWN;
          needsSave = true;
        }
        // Clean title noise from old data
        if (r.title && TITLE_SUFFIX_NOISE.test(r.title)) {
          r.title = r.title.replace(TITLE_SUFFIX_NOISE, '').trim();
          needsSave = true;
        }
      });
      if (needsSave) {
        await chrome.storage.local.set({ myResumes: panelState.myResumes });
        mainLog.info('Migrated resume data: added visibility, cleaned titles');
      }
      renderMyResumesPanel();
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

  // Resume: load from current page (when already on /resume/{hash})
  window.addEventListener('hh-ar-load-resume', async () => {
    if (!panelState.isLoggedIn) return;
    const path = window.location.pathname;
    setStatus('Загрузка резюме...');

    // Show loading spinner in the panel content area
    showResumeLoading('Загрузка резюме...');

    try {
    if (/\/resume\/[a-f0-9]+/.test(path)) {
      let resume;

      if (/\/resume\/edit\//.test(path)) {
        // EDIT page: DOM differs from view, fetch the view page instead
        const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
        if (editMatch) {
          const resumeId = editMatch[1];
          const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + resumeId;
          mainLog.info('Edit page detected, fetching view: ' + viewUrl);
          try {
            resume = await fetchAndParseResume(viewUrl);
            mainLog.info('Fetched resume from edit page: ' + resume.title);
          } catch (err) {
            mainLog.error('Failed to fetch resume from edit page: ' + err.message);
            setStatus('Ошибка загрузки: ' + err.message);
            return;
          }
        } else {
          setStatus('Не удалось извлечь ID резюме из URL');
          return;
        }
      } else {
        // VIEW page: parse the live DOM directly
        await expandHiddenSections();
        resume = parseResume();
      }

      // Validate: don't save empty results over good data
      const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
      if (hasUsefulData) {
        panelState.resume = resume;
        panelState._resumeCleared = false;
        await chrome.storage.local.set({ myResume: resume });
        await saveMyResume(resume);
        panelState.myResumes = await getMyResumes();
        renderResumePanel();
        renderMyResumesPanel();
        setStatus('Резюме загружено: ' + (resume.title || 'Без названия'));
        mainLog.info('Resume loaded and saved: ' + resume.title);
      } else {
        setStatus('Не удалось распознать резюме на этой странице (нет данных)');
        mainLog.warn('Parse result has no useful data — not saving. Found: ' +
          JSON.stringify(resume._debug?.found) + ' Missing: ' +
          JSON.stringify(resume._debug?.missing));
      }
    } else if (path.includes('/applicant/resumes')) {
      // Resume list page: load the list AND auto-select first resume from synced data
      const list = parseResumeList();
      if (list.length > 0) {
        panelState.resumeList = list;
        renderResumeListPanel();
        mainLog.info('Resume list loaded: ' + list.length + ' resumes');
      }

      // Also load the first synced resume into the detail panel
      const synced = panelState.myResumes || [];
      if (synced.length > 0 && synced[0].id) {
        panelState.resume = synced[0];
        panelState._resumeCleared = false;
        chrome.storage.local.set({ myResume: synced[0] });
        renderResumePanel();
        setStatus('Найдено резюме: ' + list.length + '. Показано: ' + (synced[0].title || 'Без названия'));
      } else {
        setStatus('Найдено резюме: ' + list.length + '. Нажмите «Синхронизировать» для загрузки');
      }
    } else {
      // Not on a resume page (main page, vacancy page, etc.)
      // Load the first synced resume if available, otherwise suggest syncing
      const synced = panelState.myResumes || [];
      if (synced.length > 0 && synced[0].id) {
        panelState.resume = synced[0];
        panelState._resumeCleared = false;
        chrome.storage.local.set({ myResume: synced[0] });
        renderResumePanel();
        renderMyResumesPanel();
        setStatus('Загружено из синхронизации: ' + (synced[0].title || 'Без названия'));
        mainLog.info('Loaded resume from synced data: ' + synced[0].title);
      } else {
        setStatus('Нет сохранённых резюме. Используйте «Синхронизировать все»');
        mainLog.info('No synced resumes available on non-resume page');
      }
    }
    } catch (err) {
      mainLog.error('Load resume error: ' + err.message);
      setStatus('Ошибка: ' + err.message);
    } finally {
      // Signal completion for button loading state — ALWAYS dispatch
      window.dispatchEvent(new CustomEvent('hh-ar-load-resume-done'));
    }
  });

  // Sync all resumes -- works from ANY hh.ru page
  window.addEventListener('hh-ar-sync-resumes', handleSyncResumes);
}

function renderSyncProgress(done, total, msg) {
  const listEl = refs.shadowRoot?.getElementById('res-sync-list');
  if (!listEl) return;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  listEl.innerHTML =
    '<div style="padding:8px;text-align:center;">' +
      '<div style="font-size:12px;font-weight:600;margin-bottom:6px;">' + esc(msg) + '</div>' +
      '<div style="background:#e4e4e7;border-radius:4px;height:6px;overflow:hidden;">' +
        '<div style="background:#059669;height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.3s;"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:#71717a;margin-top:4px;">' + done + ' / ' + total + '</div>' +
    '</div>';
}

/**
 * Show a loading spinner in the resume panel content area.
 * Replaces #res-parsed-data with spinner + message.
 * renderResumePanel() will later replace this with actual data.
 */
function showResumeLoading(message) {
  const container = refs.shadowRoot?.getElementById('res-parsed-data');
  if (!container) return;
  container.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;gap:12px;">' +
      '<div class="har-spinner"></div>' +
      '<div style="font-size:12px;color:#71717a;font-weight:500;">' + esc(message || 'Загрузка...') + '</div>' +
    '</div>';
  // Auto-expand accordion if collapsed
  const body = refs.shadowRoot?.getElementById('res-parsing-body');
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    const chevron = body.previousElementSibling?.querySelector('.timeline-chevron');
    if (chevron) chevron.classList.add('open');
  }
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// BOOT
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
