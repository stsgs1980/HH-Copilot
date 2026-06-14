/**
 * UI: PANEL -- DIAGNOSTIC ACTIONS
 * ================================
 * Diagnostic functions for the panel: clear resume, dump to console, test parse.
 * Extracted from events.js to keep it focused on event binding.
 */

import { panelState, refs, clearResumeState, setActiveResumeState } from '../state.js';
import { renderResumePanel } from '../tabs/resumes.js';
import { clearActiveResume, setActiveResume } from '../../lib/storage.js';

function setStatusLine(text) {
  const el = refs.shadowRoot?.getElementById('res-status-line');
  if (el) el.textContent = text;
}

/**
 * Clear all resume data from panelState and storage.
 */
export function clearResumeData() {
  console.log('[HH-AR][Diag] Clearing resume data...');
  clearResumeState();
  clearActiveResume().then(() => {
    console.log('[HH-AR][Diag] myResume removed from storage');
    setStatusLine('Резюме очищено из памяти и storage');
    renderResumePanel();
  });
}

/**
 * Dump resume data to the browser console for debugging.
 */
export function dumpResumeToConsole() {
  console.log('[HH-AR][Diag] === DUMP START ===');
  console.log('[HH-AR][Diag] panelState.resume:', JSON.stringify(panelState.resume, null, 2));
  console.log('[HH-AR][Diag] panelState.resumeList:', panelState.resumeList?.length);
  console.log('[HH-AR][Diag] panelState.myResumes:', panelState.myResumes?.length);
  console.log('[HH-AR][Diag] panelState.vacancies:', panelState.vacancies?.length);
  console.log('[HH-AR][Diag] URL:', window.location.href);
  console.log('[HH-AR][Diag] Auth:', panelState.isLoggedIn);
  console.log('[HH-AR][Diag] === DUMP END ===');
  setStatusLine('Дамп выведен в консоль (F12)');
}

/**
 * Test parse the resume on the current page and display results.
 */
export async function testParseResume() {
  console.log('[HH-AR][Diag] === TEST PARSE START ===');
  setStatusLine('Тест парсинга...');

  const path = window.location.pathname;
  console.log('[HH-AR][Diag] Current path:', path);
  console.log('[HH-AR][Diag] Is resume page:', /\/resume\/[a-f0-9]+/.test(path));
  console.log('[HH-AR][Diag] Is edit page:', /\/resume\/edit\//.test(path));
  console.log('[HH-AR][Diag] Is resumes list:', path.includes('/applicant/resumes'));

  if (/\/resume\/[a-f0-9]+/.test(path)) {
    try {
      let resume;

      if (/\/resume\/edit\//.test(path)) {
        const editMatch = path.match(/\/resume\/([a-f0-9]+)/);
        if (editMatch) {
          const viewUrl = 'https://hh.ru/applicant/resumes/view?resume=' + editMatch[1];
          console.log('[HH-AR][Diag] Edit page, fetching view:', viewUrl);
          const { fetchAndParseResume } = await import('../../lib/resume-fetch.js');
          resume = await fetchAndParseResume(viewUrl);
        } else {
          setStatusLine('Ошибка: не удалось извлечь ID из URL');
          return;
        }
      } else {
        const { expandHiddenSections } = await import('../../parsers/resume-detail/index.js');
        const { parseResume } = await import('../../parsers/resume-detail/parse-resume.js');
        await expandHiddenSections();
        resume = parseResume();
      }

      console.log('[HH-AR][Diag] Parse result:', JSON.stringify(resume, null, 2));
      console.log('[HH-AR][Diag] Experience count:', resume.experience?.length);
      console.log('[HH-AR][Diag] Skills count:', resume.skills?.length);
      console.log('[HH-AR][Diag] Debug found:', resume._debug?.found);
      console.log('[HH-AR][Diag] Debug missing:', resume._debug?.missing);

      const hasUsefulData = resume.id && (resume.title || resume.skills.length > 0 || resume.experience.length > 0);
      if (hasUsefulData) {
        setActiveResumeState(resume);
        await setActiveResume(resume);
        renderResumePanel();
        setStatusLine('Спарсено: ' + resume.experience?.length + ' мест, ' + resume.skills?.length + ' навыков');
      } else {
        setStatusLine('Ошибка: нет полезных данных (id=' + resume.id + ')');
      }
    } catch (err) {
      console.error('[HH-AR][Diag] Parse error:', err);
      setStatusLine('Ошибка парсинга: ' + err.message);
    }
  } else {
    setStatusLine('Откройте страницу /resume/{hash} для теста');
    console.log('[HH-AR][Diag] Not on resume page, cannot test parse');
  }
  console.log('[HH-AR][Diag] === TEST PARSE END ===');
}
