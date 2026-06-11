/**
 * CONTENT: PAGE HANDLERS
 * ========================
 * URL-based page initialization logic.
 * Routes to the correct parser/handler based on the current page path.
 *
 * SPA support: hh.ru uses History API for navigation.
 * We detect URL changes via popstate + pushState/replaceState patches
 * and re-route to the appropriate handler.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getStats, saveMyResume, getMyResumes, setActiveResume, getApplyQueue, setApplyQueue, saveVacancyDetail, saveVacancyScore } from '../lib/storage.js';
import { parseVacanciesFromPage } from '../parsers/vacancy-list.js';
import { diagnoseVacancyPage } from '../parsers/vacancy-diagnostic.js';
import { parseVacancyDetail } from '../parsers/vacancy-detail.js';
import { parseResume, parseResumeList, expandHiddenSections } from '../parsers/resume-detail.js';
import { fetchAndParseResume } from '../lib/resume-fetch.js';
import { continueApply } from '../engine/index.js';
import { computeMatchScore } from '../lib/match-scorer.js';
import { panelState, updateVacancies, updateStats } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { setActiveResumeState, setMyResumes, setResumeList } from '../ui/state.js';

const pageLog = createLogger('Main');

/** Tracks which URL path was last handled — prevents duplicate SPA triggers */
let lastHandledPath = '';

/**
 * Initialize page-specific logic (parsers, observers).
 * Called ONCE when auth state changes from false/null to true.
 * Also sets up SPA navigation listener.
 */
export async function initPageLogic() {
  const currentPath = window.location.pathname;

  // Handle initial page
  await routeToHandler(currentPath);
  lastHandledPath = currentPath;

  // Set up SPA navigation detection
  setupSPARouting();

  pageLog.info('Page logic initialized, SPA routing active');
}

/** Reset state (for testing). */
export function resetPageInit() {
  lastHandledPath = '';
}

// ═══════════════════════════════════════════════
// SPA ROUTING
// ═══════════════════════════════════════════════

/**
 * Detect SPA navigation on hh.ru.
 * - popstate: browser back/forward
 * - pushState/replaceState: hh.ru's client-side routing
 */
function setupSPARouting() {
  // Browser back/forward
  window.addEventListener('popstate', () => {
    onSPANavigate(window.location.pathname);
  });

  // Patch pushState / replaceState
  const origPush = history.pushState;
  history.pushState = function() {
    origPush.apply(this, arguments);
    onSPANavigate(window.location.pathname);
  };

  const origReplace = history.replaceState;
  history.replaceState = function() {
    origReplace.apply(this, arguments);
    onSPANavigate(window.location.pathname);
  };
}

/**
 * Called on every SPA navigation. Debounced to avoid duplicate triggers.
 */
let spaTimer = null;
function onSPANavigate(newPath) {
  if (newPath === lastHandledPath) return;
  clearTimeout(spaTimer);
  spaTimer = setTimeout(async () => {
    if (window.location.pathname === lastHandledPath) return;
    const path = window.location.pathname;
    pageLog.info('SPA navigate: ' + lastHandledPath + ' → ' + path);
    await routeToHandler(path);
    lastHandledPath = path;
  }, 300);
}

// ═══════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════

async function routeToHandler(path) {
  pageLog.info('Routing: ' + path);

  if (path.startsWith('/search/vacancy')) {
    await handleVacancySearchPage();
  } else if (/^\/resume\/[a-f0-9]+/.test(path)) {
    await handleResumeDetailPage(path);
  } else if (path.startsWith('/applicant/resumes')) {
    await handleResumeListPage();
  } else if (/^\/vacancy\/\d+/.test(path)) {
    await handleVacancyDetailPage(path);
  }
}

// ═══════════════════════════════════════════════
// PAGE HANDLERS
// ═══════════════════════════════════════════════

// ── Vacancy search page ──

let searchObserverActive = false;

async function handleVacancySearchPage() {
  const vacancies = await parseVacanciesFromPage(panelState.resume);
  updateVacancies(vacancies);
  const stats = getStats();
  updateStats(stats);

  // Set up SPA MutationObserver only once
  if (!searchObserverActive) {
    searchObserverActive = true;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Only re-parse if still on search page
        if (!window.location.pathname.startsWith('/search/vacancy')) return;
        const fresh = parseVacanciesFromPage(panelState.resume);
        fresh.then(v => updateVacancies(v));
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('SPA observer active');
  }
}

// ── Resume detail page ──

async function handleResumeDetailPage(path) {
  if (/\/resume\/edit\//.test(path)) {
    const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
    if (editMatch) {
      const resumeId = editMatch[1];
      const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + resumeId;
      pageLog.info('Edit page detected, fetching view: ' + viewUrl);
      try {
        const resume = await fetchAndParseResume(viewUrl);
        if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
          await saveResumeToState(resume);
          pageLog.info('Auto-fetched resume (from edit page): ' + resume.title);
        }
      } catch (err) {
        pageLog.warn('Failed to fetch resume from edit page: ' + err.message);
      }
    }
  } else {
    await expandHiddenSections();
    const resume = parseResume();
    if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
      await saveResumeToState(resume);
      pageLog.info('Auto-parsed resume: ' + resume.title);
    }
  }
}

// ── Resume list page ──

async function handleResumeListPage() {
  const resumeList = parseResumeList();
  setResumeList(resumeList);
  const list = await getMyResumes();
  setMyResumes(list);
  renderMyResumesPanel();
  pageLog.info('Resume list page: ' + resumeList.length + ' resumes');
}

// ── Vacancy detail page ──

async function handleVacancyDetailPage(path) {
  pageLog.info('Vacancy detail page detected');

  // Run vacancy page diagnostic (sends data to __hhVacDiagData)
  try {
    const diag = diagnoseVacancyPage();
    const fieldCount = Object.keys(diag.autoDetect || {})
      .filter(k => diag.autoDetect[k] && (diag.autoDetect[k].value || diag.autoDetect[k].found))
      .length;
    pageLog.info('Vacancy diagnostic: ' + fieldCount + ' fields detected');
  } catch (e) {
    pageLog.warn('Vacancy diagnostic failed: ' + e.message);
  }

  // Parse vacancy detail
  try {
    const detail = parseVacancyDetail();
    if (detail) {
      // Compute match score against active resume
      const resume = panelState.resume;
      if (resume) {
        const score = computeMatchScore(resume, detail);
        detail.matchScore = score.total;
        detail.matchBreakdown = score.breakdown;
        pageLog.info('Match score: ' + score.total + '% (skills=' + score.breakdown.skills + ', title=' + score.breakdown.title + ', salary=' + score.breakdown.salary + ', exp=' + score.breakdown.experience + ')');
        // Save score to storage
        saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {});
      } else {
        pageLog.info('No active resume — skip match scoring');
      }
      pageLog.info('Vacancy parsed: ' + detail.title + ' | skills=' + detail.keySkills.length + ' | salary=' + detail.salary.raw);
      // Store for debugging
      window.__hhVacDetail = detail;
      // Save detail to storage
      saveVacancyDetail(detail).catch(() => {});
    } else {
      pageLog.warn('Vacancy detail parse returned null');
    }
  } catch (e) {
    pageLog.error('Vacancy detail parse failed: ' + e.message);
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
  } catch (e) {
    pageLog.error('Error processing apply queue: ' + e.message);
  }
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

async function saveResumeToState(resume) {
  setActiveResumeState(resume);
  await setActiveResume(resume);
  saveMyResume(resume).then(() => {
    getMyResumes().then(list => {
      setMyResumes(list);
      renderMyResumesPanel();
    });
  });
}
