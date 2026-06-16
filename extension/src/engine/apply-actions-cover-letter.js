/**
 * ENGINE: APPLY ACTIONS -- COVER LETTER FILLING
 * ================================================
 * Fills the cover letter textarea in the apply popup with a
 * personalized letter based on vacancy + resume data.
 *
 * Split from src/engine/apply-actions.js (AHG Rule 12).
 * v1.9.42.0
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { generateCoverLetter } from '../lib/cover-letter-generator.js';
import { getVacancyDetail } from '../lib/storage-vacancies.js';

const coverLog = createLogger('AutoRespond');

/**
 * Active resume reference -- set by the apply orchestrator
 * before calling fillCoverLetter().
 * This avoids importing panelState (circular dependency risk).
 */
let _activeResume = null;

/**
 * Set the active resume for cover letter generation.
 * Called by the apply orchestrator before navigating to vacancy page.
 * @param {Object|null} resume
 */
export function setActiveResumeForCoverLetter(resume) {
  _activeResume = resume;
}

/**
 * Fill the cover letter textarea with a tailored letter.
 * Uses vacancy data (from __hhVacDetail or storage) and resume data
 * to generate a personalized cover letter.
 *
 * @param {HTMLTextAreaElement|HTMLElement} inputEl -- The cover letter input element
 * @returns {Promise<boolean>} Whether a letter was filled
 */
export async function fillCoverLetter(inputEl) {
  try {
    // Get vacancy ID from current URL
    const urlMatch = window.location.pathname.match(/\/vacancy\/(\d+)/);
    const vacancyId = urlMatch ? urlMatch[1] : null;

    if (!vacancyId) {
      coverLog.info('Cannot extract vacancy ID for cover letter');
      return false;
    }

    // Collect vacancy data from multiple sources
    let vacancy = window.__hhVacDetail || null;

    // If no detail page data, try storage
    if (!vacancy || vacancy.id !== vacancyId) {
      try {
        vacancy = await getVacancyDetail(vacancyId);
      } catch (_e) {
        coverLog.warn('Could not load vacancy detail from storage');
      }
    }

    if (!vacancy) {
      coverLog.info('No vacancy data available for cover letter generation');
      return false;
    }

    // Get resume data
    const resume = _activeResume;

    // Read custom template from sidebar (if panel is open)
    const template = readCustomTemplateFromSidebar();

    // Generate cover letter
    const result = generateCoverLetter(vacancy, resume, { template });

    if (!result.text || result.text.length < 10) {
      coverLog.info('Cover letter generation returned empty text (method: ' + result.method + ')');
      return false;
    }

    // Fill the input -- use native input value setter for React compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputEl, result.text);
    } else {
      inputEl.value = result.text;
    }

    // Dispatch input event so React/Magritte picks up the change
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    coverLog.info(
      'Cover letter filled (' + result.text.length + ' chars, method: ' + result.method +
      ', skills: ' + (result.placeholders.matching || 'none') + ')'
    );

    return true;
  } catch (err) {
    coverLog.warn('Cover letter fill failed: ' + err.message);
    return false;
  }
}

/**
 * Read a user-defined cover letter template from the sidebar textarea,
 * if the sidebar is open and the template is non-empty.
 *
 * @returns {string|null}
 */
function readCustomTemplateFromSidebar() {
  try {
    const sidebarEl = document.querySelector('#hh-copilot-sidebar');
    if (!sidebarEl) return null;
    const shadowRoot = sidebarEl.shadowRoot;
    if (!shadowRoot) return null;
    const textarea = shadowRoot.getElementById('cover-letter-text');
    if (!textarea || !textarea.value) return null;
    return textarea.value;
  } catch (_e) {
    // Sidebar not available -- use default template
    return null;
  }
}
