/**
 * CONTENT: Resume Loader (boot sequence)
 * =========================================
 * Extracted from main.js for AHG Rule 12 (anti-monolith).
 *
 * Loads saved active resume + myResumes list from storage at boot.
 * Migrates old data: backfills visibility field, cleans title noise.
 *
 * v1.9.47.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getActiveResume, setActiveResume, getMyResumes, saveMyResumes } from '../lib/storage.js';
import { panelState } from '../ui/panel.js';
import { renderMyResumesPanel } from '../ui/tabs/resumes.js';
import { setActiveResumeState, setMyResumes } from '../ui/state.js';
import { VISIBILITY_UNKNOWN, TITLE_SUFFIX_NOISE } from '../lib/resume-constants.js';

const loaderLog = createLogger('Main');

/**
 * Load saved active resume + myResumes list from storage.
 * Migrates old data: backfills visibility field, cleans title noise.
 */
export async function loadSavedResumes() {
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
      loaderLog.info('Loaded saved resume: ' + savedResume.title);
      // Notify listeners (e.g. vacancy detail re-score) that resume is available
      window.dispatchEvent(new CustomEvent('hh-ar-resume-loaded', { detail: { resume: savedResume } }));
    }
  } catch (_e) {}

  try {
    setMyResumes(await getMyResumes());
    if (panelState.myResumes.length > 0) {
      loaderLog.info('Loaded ' + panelState.myResumes.length + ' saved resumes');
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
        loaderLog.info('Migrated resume data: added visibility, cleaned titles');
      }
      renderMyResumesPanel();
    }
  } catch (_e) {}
}
