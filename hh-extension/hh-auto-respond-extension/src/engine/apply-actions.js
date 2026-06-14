/**
 * ENGINE: APPLY ACTIONS
 * ========================
 * DOM interaction for the automated apply workflow:
 * finding apply buttons, clicking them, and handling popups.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { findElement } from '../lib/selectors.js';
import { randomDelay } from '../lib/timing.js';
import { generateCoverLetter, findVacancyData } from '../lib/cover-letter-generator.js';
import { getVacancyDetail } from '../lib/storage-vacancies.js';

const autoLog = createLogger('AutoRespond');

/**
 * Wait for the vacancy page to fully render (up to 15 seconds).
 * Looks for the vacancy title element as a readiness signal.
 */
export async function waitForPageReady() {
  for (let i = 0; i < 30; i++) {
    const title = findElement('vacancyTitleOnPage');
    if (title) return;
    await new Promise(r => setTimeout(r, 500));
  }
  // Even if title not found by selector, page might still be loaded
  autoLog.warn('Timeout waiting for vacancy title, proceeding anyway');
}

/**
 * CSS selectors for the "Откликнуться" (Apply) button, tried in order.
 * Covers Magritte data-qa, legacy Bloko, and URL-based selectors.
 */
const APPLY_BUTTON_SELECTORS = [
  '[data-qa="vacancy-response-apply"]',
  '[data-qa="vacancy-response-link-top"]',
  'a[data-qa="vacancy-response-apply"]',
  'button[data-qa="vacancy-response-apply"]',
  'a[href*="/vacancy/response"]',
  '.vacancy-response-btn',
  '[class*="vacancy-response"] button',
  '[class*="vacancy-response"] a',
];

/**
 * Find and click the "Откликнуться" (Apply) button on the vacancy page.
 * Tries multiple selectors with retries, then falls back to text search.
 * @returns {Promise<{clicked: boolean, reason?: string}>}
 */
export async function clickApplyButton() {
  // First, check if already applied
  const alreadyApplied = findElement('alreadyApplied');
  if (alreadyApplied) {
    return { clicked: false, reason: 'Вы уже откликнулись' };
  }

  // Also check for archived/removed vacancy
  const vacancyBody = document.querySelector('[data-qa="vacancy-description"]');
  if (!vacancyBody && document.body.textContent.includes('Вакансия недоступна')) {
    return { clicked: false, reason: 'Вакансия недоступна/удалена' };
  }

  // Try each selector with retries
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const sel of APPLY_BUTTON_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        if (!document.body.contains(el)) continue;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        autoLog.info('Found apply button: ' + sel + ' (attempt ' + (attempt + 1) + ')');

        // Click with human-like delay
        await randomDelay();
        el.click();
        autoLog.info('Clicked apply button');
        return { clicked: true };
      } catch (e) { /* invalid selector, skip */ }
    }

    // Wait and retry if not found
    if (attempt < 2) {
      autoLog.info('Apply button not found, retrying in 1s...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Last resort: brute-force text search
  const allLinks = document.querySelectorAll('a, button');
  for (const el of allLinks) {
    const text = (el.textContent || '').trim().toLowerCase();
    if (text === 'откликнуться' || text === 'откликнуться на вакансию') {
      autoLog.info('Found apply button via text search: "' + text + '"');
      await randomDelay();
      el.click();
      return { clicked: true };
    }
  }

  // Dump DOM info for debugging
  autoLog.warn('No apply button found. URL: ' + window.location.href);
  const bodySnippet = document.body?.innerText?.substring(0, 500) || 'empty';
  autoLog.warn('Page snippet: ' + bodySnippet);

  return { clicked: false, reason: 'Кнопка "Откликнуться" не найдена на странице' };
}

/**
 * CSS selectors for the submit button inside the apply popup/modal.
 */
const POPUP_SUBMIT_SELECTORS = [
  '[data-qa="vacancy-response-submit-popup"]',
  '[data-qa="vacancy-response-popup-submit"]',
  'button[data-qa="vacancy-response-submit-popup"]',
  '[class*="response-popup"] button[type="submit"]',
  '[class*="response-popup"] [data-qa*="submit"]',
];

/**
 * After clicking "Откликнуться", wait for the apply popup/modal to appear
 * and click the submit button. Handles optional relocation confirmation.
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function waitForPopupAndSubmit() {
  // Wait for popup (up to 8 seconds)
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));

    for (const sel of POPUP_SUBMIT_SELECTORS) {
      try {
        const btn = document.querySelector(sel);
        if (!btn) continue;
        if (!document.body.contains(btn)) continue;

        const style = window.getComputedStyle(btn);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        autoLog.info('Found submit button in popup: ' + sel);

        // Fill cover letter if input is present
        const letterInput = findElement('coverLetterInput');
        if (letterInput) {
          await fillCoverLetter(letterInput);
        }

        // Handle relocation warning if present
        const relocationBtn = findElement('relocationConfirm');
        if (relocationBtn) {
          autoLog.info('Confirming relocation warning...');
          relocationBtn.click();
          await new Promise(r => setTimeout(r, 500));
        }

        // Click submit
        await randomDelay();
        btn.click();
        autoLog.info('Clicked submit button');
        return { success: true };
      } catch (e) { /* skip */ }
    }
  }

  // Check if maybe the popup was a simple redirect (no popup needed)
  // or the page already shows "already applied"
  const alreadyEl = findElement('alreadyApplied');
  if (alreadyEl) {
    autoLog.info('Popup not needed -- already applied indicator found');
    return { success: true };
  }

  autoLog.warn('Popup/submit button not found after 8s');
  return { success: false, reason: 'Попап не появился или кнопка отправки не найдена' };
}

// ═══════════════════════════════════════════════
// COVER LETTER FILLING
// ═══════════════════════════════════════════════

/**
 * Active resume reference — set by the apply orchestrator
 * before calling waitForPopupAndSubmit().
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
 * @param {HTMLTextAreaElement|HTMLElement} inputEl — The cover letter input element
 * @returns {Promise<boolean>} Whether a letter was filled
 */
async function fillCoverLetter(inputEl) {
  try {
    // Get vacancy ID from current URL
    const urlMatch = window.location.pathname.match(/\/vacancy\/(\d+)/);
    const vacancyId = urlMatch ? urlMatch[1] : null;

    if (!vacancyId) {
      autoLog.info('Cannot extract vacancy ID for cover letter');
      return false;
    }

    // Collect vacancy data from multiple sources
    let vacancy = window.__hhVacDetail || null;

    // If no detail page data, try storage
    if (!vacancy || vacancy.id !== vacancyId) {
      try {
        vacancy = await getVacancyDetail(vacancyId);
      } catch (e) {
        autoLog.warn('Could not load vacancy detail from storage: ' + e.message);
      }
    }

    if (!vacancy) {
      autoLog.info('No vacancy data available for cover letter generation');
      return false;
    }

    // Get resume data
    const resume = _activeResume;

    // Read custom template from sidebar (if panel is open)
    let template = null;
    try {
      const sidebarEl = document.querySelector('#hh-copilot-sidebar');
      if (sidebarEl) {
        const shadowRoot = sidebarEl.shadowRoot;
        if (shadowRoot) {
          const textarea = shadowRoot.getElementById('cover-letter-text');
          if (textarea && textarea.value) {
            template = textarea.value;
          }
        }
      }
    } catch (e) {
      // Sidebar not available — use default template
    }

    // Generate cover letter
    const result = generateCoverLetter(vacancy, resume, { template });

    if (!result.text || result.text.length < 10) {
      autoLog.info('Cover letter generation returned empty text (method: ' + result.method + ')');
      return false;
    }

    // Fill the input — use native input value setter for React compatibility
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

    autoLog.info(
      'Cover letter filled (' + result.text.length + ' chars, method: ' + result.method +
      ', skills: ' + (result.placeholders.matching || 'none') + ')'
    );

    return true;
  } catch (err) {
    autoLog.warn('Cover letter fill failed: ' + err.message);
    return false;
  }
}
