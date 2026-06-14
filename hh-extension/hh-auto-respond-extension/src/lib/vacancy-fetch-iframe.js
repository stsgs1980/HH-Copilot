/**
 * VACANCY FETCH — Strategy 1: iframe
 * =====================================
 * Fetches a vacancy detail page in a hidden iframe, waits for
 * React/Magritte hydration, then parses the fully-rendered DOM
 * using the same vacancy-detail parser.
 *
 * Modeled after resume-fetch-strategy6-iframe.js but simpler:
 *   - No "Развернуть" buttons to click
 *   - No visibility detection
 *   - Shorter hydration wait (3s vs 4s for resumes)
 *   - Graceful fallback if iframe is cross-origin blocked
 *
 * v1.9.29.0
 */

import { createLogger } from './anti-hallucination.js';
import { parseVacancyDetailFromDoc } from './vacancy-fetch-text.js';

const fetchLog = createLogger('VacFetchIframe');

/** Max time to wait for iframe page load (ms) */
const IFRAME_LOAD_TIMEOUT = 12000;

/** Time to wait for React/Magritte hydration after load (ms) */
const HYDRATION_DELAY = 3000;

/**
 * Fetch and parse a vacancy detail page via hidden iframe.
 * Returns a full vacancy detail object or null on failure.
 *
 * @param {string} vacancyUrl — Full URL like https://hh.ru/vacancy/12345
 * @returns {Promise<Object|null>}
 */
export async function fetchVacancyViaIframe(vacancyUrl) {
  fetchLog.info('Loading vacancy in iframe: ' + vacancyUrl);

  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;' +
    'opacity:0;pointer-events:none;border:none;';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.src = vacancyUrl;
  document.body.appendChild(iframe);

  try {
    // Wait for iframe page to fully load
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('iframe load timeout (' + IFRAME_LOAD_TIMEOUT + 'ms)')),
        IFRAME_LOAD_TIMEOUT
      );
      iframe.addEventListener('load', () => {
        clearTimeout(timeout);
        resolve();
      });
      iframe.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('iframe load error'));
      });
    });

    // Wait for React/Magritte hydration
    await new Promise(r => setTimeout(r, HYDRATION_DELAY));

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document (cross-origin or blocked)');
    }

    // Check that we actually loaded a vacancy page, not a login/captcha
    const title = iframeDoc.title || '';
    if (title.includes('Вход') || title.includes('Login') || title.includes('403') || title.includes('429')) {
      fetchLog.warn('Iframe loaded non-vacancy page: "' + title.substring(0, 60) + '"');
      return null;
    }

    // Parse using the shared document-level parser
    const vacancy = parseVacancyDetailFromDoc(iframeDoc, vacancyUrl);

    if (vacancy) {
      vacancy._fetchMethod = 'iframe';
      fetchLog.info(
        'Iframe parsed: "' + vacancy.title.substring(0, 40) + '" | ' +
        'skills=' + vacancy.keySkills.length + ' derived=' + vacancy.derivedSkills.length +
        ' | desc=' + vacancy.description.text.length + ' chars'
      );
    } else {
      fetchLog.warn('Iframe parse returned null for ' + vacancyUrl);
    }

    return vacancy;
  } catch (err) {
    fetchLog.warn('Iframe failed for ' + vacancyUrl + ': ' + err.message);
    return null;
  } finally {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch (e) { /* ignore cleanup errors */ }
  }
}
