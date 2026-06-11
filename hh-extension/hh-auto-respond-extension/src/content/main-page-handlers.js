/**
 * CONTENT: PAGE HANDLERS
 * ========================
 * URL-based page initialization logic.
 * Routes to the correct parser/handler based on the current page path.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getStats, saveMyResume, getMyResumes, setActiveResume, getApplyQueue, setApplyQueue } from '../lib/storage.js';
import { parseVacanciesFromPage } from '../parsers/vacancy-list.js';
import { diagnoseVacancyPage } from '../parsers/vacancy-diagnostic.js';
import { parseResume, parseResumeList, expandHiddenSections } from '../parsers/resume-detail.js';
import { fetchAndParseResume } from '../lib/resume-fetch.js';
import { continueApply } from '../engine/index.js';
import { panelState, updateVacancies, updateStats } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { setActiveResumeState, setMyResumes, setResumeList } from '../ui/state.js';

const pageLog = createLogger('Main');
let pageInitialized = false;

/**
 * Initialize page-specific logic (parsers, observers).
 * Called ONCE when auth state changes from false/null to true.
 */
export async function initPageLogic() {
  if (pageInitialized) return;
  pageInitialized = true;
  pageLog.info('User logged in -- initializing page logic');

  const path = window.location.pathname;
  pageLog.info('Page: ' + path);

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

/** Reset page init flag (for testing or re-init). */
export function resetPageInit() {
  pageInitialized = false;
}

// ── Vacancy search page ──

async function handleVacancySearchPage() {
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
  pageLog.info('SPA observer active');
}

// ── Resume detail page ──

async function handleResumeDetailPage(path) {
  if (/\/resume\/edit\//.test(path)) {
    // EDIT page: DOM differs from view page, use fetch-based parser instead
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
    // VIEW page: parse the live DOM directly
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
    pageLog.info('Vacancy diagnostic: ' + Object.keys(diag.autoDetect || {}).filter(k => diag.autoDetect[k] && diag.autoDetect[k].value).length + ' auto-detected fields');
  } catch (e) {
    pageLog.warn('Vacancy diagnostic failed: ' + e.message);
  }

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

// ── Helpers ──

/**
 * Save a parsed resume to panelState and storage, then re-render.
 */
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
