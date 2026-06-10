/**
 * Strategy 6: Fetch expanded experience (orchestrator).
 *
 * hh.ru's resume page has a "Свернуть"/"Развернуть" button in the experience
 * section. In SSR, only 3 company-cards are rendered. The "Развернуть"
 * button does NOT use AJAX — React/Magritte loads all data during client-side
 * hydration and the button simply toggles component visibility in React state.
 * The full experience data is never in the SSR HTML or <script> tags.
 *
 * Sub-modules:
 *   resume-fetch-strategy6-iframe.js  — iframe approach (PRIMARY)
 *   resume-fetch-strategy6-urls.js    — URL discovery + fetch
 *   resume-fetch-strategy6-api.js     — applicant API + JSON/expanded-doc parsing
 */
import { createLogger } from './anti-hallucination.js';
import { fetchHtml, htmlToDoc } from './resume-fetch-helpers.js';
import { fetchExpandedExperienceViaIframe } from './resume-fetch-strategy6-iframe.js';
import { findExpansionUrls, tryFetchExpandedUrl } from './resume-fetch-strategy6-urls.js';
import { tryApplicantApi, parseExperienceFromExpandedDoc } from './resume-fetch-strategy6-api.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Try to fetch full experience data when SSR only renders 3 entries.
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @param {string} resumeId - Resume hash ID
 * @param {number} currentCount - Number of experience entries already found
 * @param {string} resumeUrl - Original resume URL (for re-fetching)
 * @returns {Promise<Array>} Experience entries (may be same count or more)
 */
export async function fetchExpandedExperience(doc, html, resumeId, currentCount, resumeUrl) {
  fetchLog.info('Strategy 6: starting (currentCount=' + currentCount + ', resumeId=' + (resumeId || 'none') + ')');

  // ── Step 0 [PRIMARY]: Load resume in hidden iframe, click "Развернуть", parse DOM ──
  try {
    const iframeEntries = await fetchExpandedExperienceViaIframe(resumeUrl, currentCount);
    if (iframeEntries.length > currentCount) {
      fetchLog.info('Strategy 6: SUCCESS via iframe — got ' + iframeEntries.length + ' experiences');
      return iframeEntries;
    }
  } catch (err) {
    fetchLog.info('Strategy 6: iframe approach failed: ' + err.message);
  }

  // ── Step 1: Find "Развернуть" / "Показать все" button URLs ──
  const expansionUrls = findExpansionUrls(doc, html, resumeId);
  fetchLog.info('Strategy 6: found ' + expansionUrls.length + ' candidate expansion URLs');
  expansionUrls.forEach((u, i) => {
    fetchLog.info('  URL ' + i + ': ' + u.url + ' (source: ' + u.source + ')');
  });

  // ── Step 2: Try each expansion URL ──
  for (const { url, source } of expansionUrls) {
    try {
      fetchLog.info('Strategy 6: fetching [' + source + '] ' + url);
      const result = await tryFetchExpandedUrl(url, currentCount);
      if (result && result.length > currentCount) {
        fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + result.length + ' experiences');
        return result;
      }
    } catch (err) {
      fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
    }
  }

  // ── Step 3: Try applicant internal API ──
  const apiEntries = await tryApplicantApi(resumeId, currentCount);
  if (apiEntries.length > currentCount) {
    return apiEntries;
  }

  // ── Step 4: Try re-fetching with expansion query parameters ──
  if (resumeUrl) {
    const expandVariants = [
      { url: resumeUrl + '&expand=experience_items', source: 'expand-experience-items' },
      { url: resumeUrl + '&showAll=true', source: 'showAll' },
      { url: resumeUrl + '&full=true', source: 'full' },
      { url: resumeUrl + '&expand=all', source: 'expand-all' },
    ];

    for (const { url, source } of expandVariants) {
      try {
        fetchLog.info('Strategy 6: trying param [' + source + '] ' + url);
        const expandedHtml = await fetchHtml(url);
        const expandedDoc = htmlToDoc(expandedHtml);
        const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
        const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');

        fetchLog.info('Strategy 6: [' + source + '] returned HTML with ' +
          expCards.length + ' company-cards, ' + stepperItems.length + ' stepper-items');

        if (expCards.length > currentCount || stepperItems.length > currentCount) {
          const parsed = parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
          if (parsed.length > currentCount) {
            fetchLog.info('Strategy 6: SUCCESS from ' + source + ' — got ' + parsed.length + ' experiences');
            return parsed;
          }
        }
      } catch (err) {
        fetchLog.info('Strategy 6: [' + source + '] error: ' + err.message);
      }
    }
  }

  fetchLog.info('Strategy 6: all approaches exhausted, returning current count: ' + currentCount);
  return [];
}
