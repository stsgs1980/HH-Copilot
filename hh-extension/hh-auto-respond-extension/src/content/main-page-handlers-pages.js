/**
 * CONTENT: PAGE HANDLERS -- Handler implementations
 * ================================================
 * Individual page handler functions extracted from main-page-handlers.js
 * for anti-monolith compliance.
 *
 * Vacancy search + vacancy detail + main page handlers are in
 *   ./main-page-handlers-vacancy.js
 *
 * This file contains: resume detail, resume list, and negotiations handlers.
 *
 * Split from original 362-line file (AHG Rule 12).
 * v1.9.41.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { saveMyResume, getMyResumes, setActiveResume, markAsApplied } from '../lib/storage.js';
import { parseNegotiations } from '../parsers/negotiations.js';
import { parseResume, parseResumeList, expandHiddenSections } from '../parsers/resume-detail.js';
import { fetchAndParseResume } from '../lib/resume-fetch.js';
import { panelState } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { setActiveResumeState, setMyResumes, setResumeList, setNegotiations } from '../ui/state.js';

// Re-export vacancy + main page handlers for callers that import from here
export {
  handleVacancySearchPage,
  handleVacancyDetailPage,
  handleMainPage,
} from './main-page-handlers-vacancy.js';

const pageLog = createLogger('Main');

// -- Resume detail page --

/**
 * Handle /resume/{hex}, /resume/edit/{hex}, and
 * /applicant/resumes/view?resume={hex} pages.
 *
 * @param {string} path -- current pathname
 */
export async function handleResumeDetailPage(path) {
  if (/\/resume\/edit\//.test(path)) {
    // Edit page: DOM differs from view, fetch the view URL instead
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
  } else if (/\/applicant\/resumes\/view/.test(path)) {
    // Applicant's own resume view: parse the current page directly
    pageLog.info('Applicant resume view page detected');
    await expandHiddenSections();
    const resume = parseResume();
    if (!resume.id) {
      const qMatch = window.location.search.match(/[?&]resume=([a-f0-9]+)/);
      if (qMatch) resume.id = qMatch[1];
    }
    if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
      await saveResumeToState(resume);
      pageLog.info('Auto-parsed resume (applicant view): ' + resume.title);
    }
  } else {
    // Standard resume page: /resume/{hex}
    await expandHiddenSections();
    const resume = parseResume();
    if (resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0)) {
      await saveResumeToState(resume);
      pageLog.info('Auto-parsed resume: ' + resume.title);
    }
  }
}

// -- Resume list page --

/**
 * Handle /applicant/resumes (resume list) page.
 */
export async function handleResumeListPage() {
  const resumeList = parseResumeList();
  setResumeList(resumeList);
  const list = await getMyResumes();
  setMyResumes(list);
  renderMyResumesPanel();
  pageLog.info('Resume list page: ' + resumeList.length + ' resumes');
}

// -- Negotiations page -- v1.9.39.0

let negotiationsObserverActive = false;

/**
 * Handle /applicant/negotiations page: parse negotiation items, mark
 * vacancy IDs as 'applied' in storage, render the list, and observe
 * SPA mutations for live updates.
 */
export async function handleNegotiationsPage() {
  pageLog.info('Negotiations page detected -- parsing negotiation items');

  const negotiations = await parseNegotiations();
  setNegotiations(negotiations);

  // v1.9.39.0: Mark vacancy IDs from negotiations as 'applied' in storage.
  const appliedIds = negotiations.filter(n => n.vacancyId).map(n => n.vacancyId);
  if (appliedIds.length > 0) {
    pageLog.info('Marking ' + appliedIds.length + ' vacancies as applied from negotiations');
    Promise.all(appliedIds.map(id => markAsApplied(id))).catch(() => {});
  }

  // Import renderNegotiationList lazily to avoid circular deps at module load
  try {
    const { renderNegotiationList } = await import('../ui/tabs/negotiations.js');
    renderNegotiationList();
  } catch (_e) {
    pageLog.warn('Failed to render negotiation list');
  }

  pageLog.info('Negotiations parsed: ' + negotiations.length + ' items');

  // SPA MutationObserver -- re-parse when DOM changes on negotiations page
  if (!negotiationsObserverActive) {
    negotiationsObserverActive = true;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!window.location.pathname.startsWith('/applicant/negotiations')) return;
        const fresh = await parseNegotiations();
        setNegotiations(fresh);
        try {
          const { renderNegotiationList } = await import('../ui/tabs/negotiations.js');
          renderNegotiationList();
        } catch (_e) {}
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('Negotiations SPA observer active');
  }
}

// -- Helper --

/**
 * Save a parsed resume to state, storage, and trigger UI re-render.
 * Dispatches 'hh-ar-resume-loaded' event for listeners in main.js.
 *
 * @param {Object} resume -- parsed resume object
 */
export async function saveResumeToState(resume) {
  setActiveResumeState(resume);
  await setActiveResume(resume);
  saveMyResume(resume).then(() => {
    getMyResumes().then(list => {
      setMyResumes(list);
      renderMyResumesPanel();
    });
  });
  window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume } }));
  pageLog.info('Resume loaded -> dispatched hh-ar-resume-loaded');
}
