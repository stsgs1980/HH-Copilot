/**
 * CONTENT: PAGE HANDLERS — Handler implementations
 * ================================================
 * Individual page handler functions extracted from main-page-handlers.js
 * for anti-monolith compliance.
 *
 * Each handler runs the appropriate parser and updates the panel.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getStats, saveMyResume, getMyResumes, setActiveResume, getApplyQueue, setApplyQueue, saveVacancyDetail, saveVacancyScore } from '../lib/storage.js';
import { parseVacanciesFromPage, parseVacanciesOfTheDay } from '../parsers/vacancy-list.js';
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

// ── Vacancy search page ──

let searchObserverActive = false;

export async function handleVacancySearchPage() {
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
        if (!window.location.pathname.startsWith('/search/vacancy')) return;
        const fresh = parseVacanciesFromPage(panelState.resume);
        fresh.then(v => updateVacancies(v));
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('SPA observer active');
  }
}

// ── Resume detail page ──

export async function handleResumeDetailPage(path) {
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

export async function handleResumeListPage() {
  const resumeList = parseResumeList();
  setResumeList(resumeList);
  const list = await getMyResumes();
  setMyResumes(list);
  renderMyResumesPanel();
  pageLog.info('Resume list page: ' + resumeList.length + ' resumes');
}

// ── Vacancy detail page ──

export async function handleVacancyDetailPage(path) {
  pageLog.info('Vacancy detail page detected');

  // Run vacancy page diagnostic
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
      const resume = panelState.resume;
      if (resume) {
        const score = computeMatchScore(resume, detail);
        detail.matchScore = score.total;
        detail.matchBreakdown = score.breakdown;
        pageLog.info('Match score: ' + score.total + '% (skills=' + score.breakdown.skills + ', title=' + score.breakdown.title + ', salary=' + score.breakdown.salary + ', exp=' + score.breakdown.experience + ')');
        saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {});
        window.dispatchEvent(new CustomEvent('hh-ar-match-updated', { detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details } }));
      } else {
        pageLog.info('No active resume — skip match scoring');
      }
      pageLog.info('Vacancy parsed: ' + detail.title + ' | skills=' + detail.keySkills.length + ' | salary=' + detail.salary.raw);
      window.__hhVacDetail = detail;
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

// ── Main page (/) ──

let mainPageObserverActive = false;

export async function handleMainPage() {
  pageLog.info('Main page detected — parsing recommended vacancies + "Vacancy of the Day"');

  const recommended = await parseVacanciesFromPage(panelState.resume);
  const votd = await parseVacanciesOfTheDay(panelState.resume);
  const allVacancies = [...recommended, ...votd];
  updateVacancies(allVacancies);
  const stats = getStats();
  updateStats(stats);

  pageLog.info('Main page: ' + recommended.length + ' recommended + ' + votd.length + ' VotD = ' + allVacancies.length + ' total');

  if (!mainPageObserverActive) {
    mainPageObserverActive = true;
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (window.location.pathname !== '/' && window.location.pathname !== '') return;
        const rec = await parseVacanciesFromPage(panelState.resume);
        const vd = await parseVacanciesOfTheDay(panelState.resume);
        updateVacancies([...rec, ...vd]);
      }, 1500);
    }).observe(document.body, { childList: true, subtree: true });
    pageLog.info('Main page SPA observer active');
  }
}

// ── Helper ──

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
  pageLog.info('Resume loaded → dispatched hh-ar-resume-loaded');
}
