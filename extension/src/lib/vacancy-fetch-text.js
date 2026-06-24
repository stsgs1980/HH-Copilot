/**
 * VACANCY FETCH -- Strategy 2: Text fetch + DOMParser
 * =====================================================
 * Fetches vacancy HTML via fetch() and parses it with DOMParser.
 * Fallback when iframe is blocked or cross-origin restricted.
 *
 * Section/skill parsing logic is in vacancy-fetch-text-parsers.js.
 *
 * IMPORTANT: DOMParser-parsed HTML does NOT execute JavaScript,
 * so React/Magritte components may not be hydrated. This means:
 *   - data-qa attributes are available (SSR-rendered)
 *   - Key skills section is usually present in SSR output
 *   - Description text is always available
 *   - Some dynamic elements may be missing
 *
 * Split from original 407-line file (AHG Rule 12).
 * v1.9.43.0
 */

import { createLogger } from './anti-hallucination.js';
import {
  parseSalaryFromDoc,
  parseDescriptionFromDoc,
  parseKeySkillsFromDoc,
} from './vacancy-fetch-text-parsers.js';
import {
  parseExperienceFromDoc,
  extractCleanCompanyName,
} from './vacancy-fetch-text-helpers.js';

// Re-export for backwards compatibility (tests import these from here).
export { extractCleanCompanyName } from './vacancy-fetch-text-helpers.js';

const fetchLog = createLogger('VacFetchText');

/**
 * Fetch vacancy HTML and parse via DOMParser.
 * Returns a full vacancy detail object or null on failure.
 *
 * @param {string} vacancyUrl -- Full URL like https://hh.ru/vacancy/12345
 * @returns {Promise<Object|null>}
 */
export async function fetchVacancyViaText(vacancyUrl) {
  fetchLog.info('Fetching vacancy via text: ' + vacancyUrl);

  try {
    const resp = await fetch(vacancyUrl, {
      credentials: 'include',
      headers: { Accept: 'text/html' }
    });

    if (!resp.ok) {
      fetchLog.warn('fetch returned ' + resp.status + ' for ' + vacancyUrl);
      return null;
    }

    const html = await resp.text();
    fetchLog.info('Fetched ' + html.length + ' chars for ' + vacancyUrl);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const vacancy = parseVacancyDetailFromDoc(doc, vacancyUrl);

    if (vacancy) {
      vacancy._fetchMethod = 'text';
      fetchLog.info(
        'Text parsed: "' + vacancy.title.substring(0, 40) + '" | ' +
        'skills=' + vacancy.keySkills.length + ' derived=' + vacancy.derivedSkills.length
      );
    }

    return vacancy;
  } catch (err) {
    fetchLog.warn('Text fetch failed for ' + vacancyUrl + ': ' + err.message);
    return null;
  }
}

// ===============================================
// SHARED DOCUMENT PARSER
// ===============================================

/**
 * Parse a vacancy detail from a Document object.
 * Works with both DOMParser output and iframe.contentDocument.
 * This is the core parser -- no dependency on global `document`.
 *
 * @param {Document} doc -- Parsed document (from DOMParser or iframe)
 * @param {string} url -- Full vacancy URL
 * @returns {Object|null} Vacancy detail object or null
 */
export function parseVacancyDetailFromDoc(doc, url) {
  // Extract vacancy ID from URL
  const idMatch = url.match(/\/vacancy\/(\d+)/);
  if (!idMatch) {
    fetchLog.warn('Cannot extract vacancy ID from URL: ' + url);
    return null;
  }

  const vacancy = {
    id: idMatch[1],
    url: url.split('?')[0].split('#')[0],
    title: '',
    company: '',
    companyUrl: '',
    salary: { raw: '', min: null, max: null, currency: 'RUB', period: 'month', net: true },
    location: '',
    experience: { raw: '', min: null, max: null },
    employment: '',
    schedule: '',
    keySkills: [],
    derivedSkills: [],
    _skillsSource: 'none',
    description: { text: '', html: '', headings: [], sections: {} },
    hiringFormat: '',
    isRemote: false,
    hasApplyButton: false,
    parsedAt: new Date().toISOString(),
    source: 'detail',
  };

  // -- Title --
  const titleEl = doc.querySelector('[data-qa="vacancy-title"]');
  if (titleEl) {
    vacancy.title = (titleEl.textContent || '').trim();
  }
  if (!vacancy.title) {
    const h1 = doc.querySelector('h1');
    if (h1) vacancy.title = (h1.textContent || '').trim();
  }
  if (!vacancy.title) {
    fetchLog.warn('No title found in document');
    return null;
  }

  // -- Company --
  // hh.ru wraps company name in a span[data-qa="vacancy-company-name"], but
  // the span's parent often contains sibling elements with review counts
  // ("4,935 отзывов") and inline <script> blocks (window.globalServiceVars=...).
  // textContent grabs ALL of that. We must extract only the company name:
  //   1. Clone the element, remove nested <script>/<style>/<svg>/<span>
  //      (those hold review counts + reviews widget config).
  //   2. Read textContent of the cleaned clone.
  //   3. Truncate at first digit-heavy review-count fragment like "4,935 отзывов"
  //      or "N отзывов" if any slipped through.
  const companyEl = doc.querySelector(
    '[data-qa="vacancy-company-name"], [data-qa="vacancy-company"]'
  );
  if (companyEl) {
    vacancy.company = extractCleanCompanyName(companyEl);
    const companyLink = companyEl.closest('a') || companyEl.querySelector('a');
    if (companyLink) {
      vacancy.companyUrl = companyLink.getAttribute('href') || '';
    }
  }

  // -- Salary --
  parseSalaryFromDoc(doc, vacancy);

  // -- Location --
  const addrEl = doc.querySelector(
    '[data-qa="vacancy-address-with-map"], [data-qa="vacancy-view-raw-address"]'
  );
  if (addrEl) {
    vacancy.location = (addrEl.textContent || '').trim().replace(/\s+/g, ' ');
  }

  // -- Experience --
  parseExperienceFromDoc(doc, vacancy);

  // -- Employment type --
  const empEl = doc.querySelector(
    '[data-qa="common-employment-text"], [data-qa*="employment"]'
  );
  if (empEl) vacancy.employment = (empEl.textContent || '').trim();

  // -- Schedule --
  const schedEl = doc.querySelector(
    '[data-qa="work-schedule-by-days-text"], [data-qa*="work-schedule"], [data-qa*="schedule"]'
  );
  if (schedEl) vacancy.schedule = (schedEl.textContent || '').trim();

  // -- Remote --
  vacancy.isRemote = !!doc.querySelector('[data-qa="vacancy-label-work-schedule-remote"]');

  // -- Description (BEFORE skills -- text is used for derivation) --
  parseDescriptionFromDoc(doc, vacancy);

  // -- Key Skills --
  parseKeySkillsFromDoc(doc, vacancy);

  // -- Hiring format --
  const hireEl = doc.querySelector('[data-qa="vacancy-hiring-formats"]');
  if (hireEl) vacancy.hiringFormat = (hireEl.textContent || '').trim().replace(/\s+/g, ' ');

  // -- Apply button --
  vacancy.hasApplyButton = !!doc.querySelector(
    '[data-qa="vacancy-response-link-top"], [data-qa="vacancy-apply-button"]'
  );

  return vacancy;
}
