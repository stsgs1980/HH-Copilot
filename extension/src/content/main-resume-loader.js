/**
 * CONTENT: RESUME LOADER
 * Handles hh-ar-load-resume and hh-ar-reparse-resume events.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getMyResumes, saveMyResume, setActiveResume } from '../lib/storage.js';
import { parseResume, parseResumeList, expandHiddenSections } from '../parsers/resume-detail.js';
import { fetchAndParseResume } from '../lib/resume-fetch.js';
import { panelState, setStatus } from '../ui/panel.js';
import { renderMyResumesPanel, renderResumePanel, renderResumeListPanel } from '../ui/tabs/resumes.js';
import { refs, setActiveResumeState, setMyResumes, setResumeList } from '../ui/state.js';

const loadLog = createLogger('Main');

/**
 * Handle the hh-ar-load-resume event.
 * Loads resume data based on the current page type.
 */
export async function handleLoadResume() {
  if (!panelState.isLoggedIn) return;
  const path = window.location.pathname;
  setStatus('Загрузка действующего резюме...');

  showResumeLoading('Загрузка действующего резюме...');

  try {
    if (/\/resume\/[a-f0-9]+/.test(path)) {
      await loadFromResumePage(path);
    } else if (path.includes('/applicant/resumes')) {
      await loadFromResumeListPage();
    } else {
      await loadFromSyncedData();
    }
  } catch (err) {
    loadLog.error('Load resume error: ' + err.message);
    setStatus('Ошибка: ' + err.message);
  } finally {
    // Signal completion for button loading state -- ALWAYS dispatch
    window.dispatchEvent(new CustomEvent('hh-ar-load-resume-done'));
  }
}

// -- Reparse: fetch active resume fresh from server --

/** Handle hh-ar-reparse-resume: ALWAYS fetches from server by URL. */
export async function handleReparseResume(e) {
  if (!panelState.isLoggedIn) return;
  const resumeUrl = e.detail?.resumeUrl;
  if (!resumeUrl) {
    loadLog.warn('Reparse: no resumeUrl provided');
    return;
  }

  setStatus('Перепарсивание резюме...');
  showResumeLoading('Перепарсивание резюме...');

  try {
    const resume = await fetchAndParseResume(resumeUrl);
    const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
    if (hasUsefulData) {
      setActiveResumeState(resume);
      await setActiveResume(resume);
      await saveMyResume(resume);
      setMyResumes(await getMyResumes());
      renderResumePanel();
      renderMyResumesPanel();
      setStatus('Перепарсено: ' + (resume.title || 'Без названия'));
      loadLog.info('Reparse: fetched and saved: ' + resume.title);
      // Notify listeners that resume is available
      window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume } }));
    } else {
      setStatus('Перепарсивание не дало данных');
      loadLog.warn('Reparse: parse result has no useful data');
    }
  } catch (err) {
    loadLog.error('Reparse error: ' + err.message);
    setStatus('Ошибка перепарсивания: ' + err.message);
  } finally {
    window.dispatchEvent(new CustomEvent('hh-ar-load-resume-done'));
  }
}

// -- Page-specific loaders --

async function loadFromResumePage(path) {
  let resume;

  if (/\/resume\/edit\//.test(path)) {
    // EDIT page: DOM differs from view, fetch the view page instead
    const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
    if (!editMatch) {
      setStatus('Не удалось извлечь ID резюме из URL');
      return;
    }
    const resumeId = editMatch[1];
    const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + resumeId;
    loadLog.info('Edit page detected, fetching view: ' + viewUrl);
    try {
      resume = await fetchAndParseResume(viewUrl);
      loadLog.info('Fetched resume from edit page: ' + resume.title);
    } catch (err) {
      loadLog.error('Failed to fetch resume from edit page: ' + err.message);
      setStatus('Ошибка загрузки: ' + err.message);
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
    setActiveResumeState(resume);
    await setActiveResume(resume);
    await saveMyResume(resume);
    setMyResumes(await getMyResumes());
    renderResumePanel();
    renderMyResumesPanel();
    setStatus('Действующее резюме загружено: ' + (resume.title || 'Без названия'));
    loadLog.info('Resume loaded and saved: ' + resume.title);
    // Notify listeners (e.g. vacancy detail re-score) that resume is available
    window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume } }));
  } else {
    setStatus('Не удалось распознать резюме на этой странице (нет данных)');
    loadLog.warn('Parse result has no useful data -- not saving. Found: ' +
      JSON.stringify(resume._debug?.found) + ' Missing: ' +
      JSON.stringify(resume._debug?.missing));
  }
}

async function loadFromResumeListPage() {
  const list = parseResumeList();
  if (list.length > 0) {
    setResumeList(list);
    renderResumeListPanel();
    loadLog.info('Resume list loaded: ' + list.length + ' resumes');
  }

  // Also load the first synced resume into the detail panel
  const synced = panelState.myResumes || [];
  if (synced.length > 0 && synced[0].id) {
    setActiveResumeState(synced[0]);
    setActiveResume(synced[0]);
    renderResumePanel();
    setStatus('Найдено резюме: ' + list.length + '. Показано: ' + (synced[0].title || 'Без названия'));
    // Notify listeners that resume is available
    window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume: synced[0] } }));
  } else {
    setStatus('Найдено резюме: ' + list.length + '. Нажмите "Синхронизировать" для загрузки');
  }
}

async function loadFromSyncedData() {
  const synced = panelState.myResumes || [];
  if (synced.length > 0 && synced[0].id) {
    setActiveResumeState(synced[0]);
    setActiveResume(synced[0]);
    renderResumePanel();
    renderMyResumesPanel();
    setStatus('Загружено из синхронизации: ' + (synced[0].title || 'Без названия'));
    loadLog.info('Loaded resume from synced data: ' + synced[0].title);
    // Notify listeners that resume is available
    window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume: synced[0] } }));
  } else {
    setStatus('Нет сохранённых резюме. Используйте "Синхронизировать все"');
    loadLog.info('No synced resumes available on non-resume page');
  }
}

// -- UI Helpers --

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
