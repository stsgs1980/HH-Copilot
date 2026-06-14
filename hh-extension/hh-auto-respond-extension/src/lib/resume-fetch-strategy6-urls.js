/**
 * Strategy 6 -- URL discovery + expansion URL fetch.
 *
 * Find candidate expansion URLs from the "Развернуть" button, Magritte state,
 * and known API patterns. Then try fetching each URL and parsing the result.
 *
 * Split from resume-fetch-strategy6-expand.js for modularity.
 */
import { createLogger } from './anti-hallucination.js';
import { htmlToDoc } from './resume-fetch-helpers.js';
import { parseCompanyCardFromDoc } from './resume-fetch-parse.js';
import { parseExperienceFromScripts } from './resume-fetch-strategy5-scripts.js';
import { parseExperienceFromJson, parseExperienceFromExpandedDoc } from './resume-fetch-strategy6-api.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Find candidate expansion URLs from the "Развернуть" button and Magritte state.
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @param {string} resumeId - Resume hash ID
 * @returns {Array<{url: string, source: string}>} Candidate URLs
 */
export function findExpansionUrls(doc, html, resumeId) {
  const urls = [];
  const seen = new Set();

  const addUrl = (url, source) => {
    if (!url || url.length < 5) return;
    const fullUrl = url.startsWith('http') ? url : 'https://hh.ru' + url;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    urls.push({ url: fullUrl, source });
  };

  // -- Source 1: "Развернуть" / "Показать все" button data-attributes --
  const expSection = doc.querySelector('[data-qa="resume-list-card-experience"]');
  const searchRoot = expSection || doc;
  const allButtons = searchRoot.querySelectorAll('button, a[href], [data-url], [data-action-url], [data-fetch-url]');
  allButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    const isExpandBtn = text.includes('показать все') || text.includes('показать ещё') ||
      text.includes('посмотреть всё') || text.includes('посмотреть все') ||
      text.includes('развернуть') || text.includes('expand') ||
      btn.getAttribute('data-qa') === 'profile-experience-viewAll';

    if (!isExpandBtn) return;

    fetchLog.info('Strategy 6: found expand button: text="' + text.substring(0, 50) +
      '" data-qa="' + (btn.getAttribute('data-qa') || '') + '"' +
      ' outerHTML=' + btn.outerHTML.substring(0, 200));

    const href = btn.getAttribute('href') || '';
    if (href && href !== '#' && href !== 'javascript:void(0)') {
      addUrl(href, 'button-href');
    }

    const dataAttrs = ['data-url', 'data-action-url', 'data-fetch-url', 'data-load-url',
      'data-api-url', 'data-endpoint', 'data-href', 'data-target'];
    let el = btn;
    for (let i = 0; i < 5 && el; i++) {
      for (const attr of dataAttrs) {
        const val = el.getAttribute(attr) || '';
        if (val && val.length > 5 && val !== '#') {
          addUrl(val, 'button-' + attr + '-ancestor' + i);
        }
      }
      el = el.parentElement;
    }
  });

  // -- Source 2: Magritte script state -- look for expansion URLs --
  const scripts = doc.querySelectorAll('script:not([src])');
  scripts.forEach(script => {
    const text = script.textContent || '';
    if (text.length < 200) return;

    const urlPatterns = [
      /["'](?:url|fetchUrl|loadMore|nextPage|apiUrl|endpoint|actionUrl|href|target)["']\s*:\s*["']([^"']+)["']/gi,
      /["'](?:loadMore|fetchUrl|nextPage|loadMoreUrl)["']\s*:\s*["']([^"']+)["']/gi,
    ];

    for (const pat of urlPatterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        const val = m[1];
        if (val && (val.includes('experience') || val.includes('resume') ||
            val.includes('expand') || val.includes('show') || val.includes('load') ||
            val.includes('applicant'))) {
          addUrl(val, 'script-url-pattern');
        }
      }
    }

    const pathMatches = text.matchAll(/["'](\/applicant\/[^"']+)["']/g);
    for (const m of pathMatches) {
      addUrl(m[1], 'script-applicant-path');
    }
  });

  // -- Source 3: Known API patterns --
  if (resumeId) {
    addUrl('https://hh.ru/applicant/resumes/view?resume=' + resumeId + '&expand=experience_items',
      'known-pattern-expand-items');
    addUrl('https://hh.ru/applicant/resumes/mine/' + resumeId + '/experience',
      'known-pattern-experience-endpoint');
  }

  return urls;
}

/**
 * Try fetching an expansion URL and parsing the result.
 * Handles both JSON and HTML responses.
 * @param {string} url - URL to fetch
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Promise<Array|null>} Experience entries or null
 */
export async function tryFetchExpandedUrl(url, currentCount) {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'text/html, application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
  });

  if (!resp.ok) {
    fetchLog.info('Strategy 6: ' + url + ' returned ' + resp.status);
    return null;
  }

  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await resp.json();
    const jsonEntries = parseExperienceFromJson(data);
    fetchLog.info('Strategy 6: JSON response had ' + jsonEntries.length + ' experiences');
    return jsonEntries;
  }

  // HTML response
  const expandedHtml = await resp.text();
  const expandedDoc = htmlToDoc(expandedHtml);
  const expCards = expandedDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const stepperItems = expandedDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');

  fetchLog.info('Strategy 6: HTML response had ' + expCards.length + ' company-cards, ' +
    stepperItems.length + ' stepper-items (' + expandedHtml.length + ' chars)');

  if (expCards.length > currentCount || stepperItems.length > currentCount) {
    return parseExperienceFromExpandedDoc(expandedDoc, expandedHtml, currentCount);
  }

  const scriptParsed = parseExperienceFromScripts(expandedDoc, expandedHtml);
  if (scriptParsed.length > currentCount) {
    return scriptParsed;
  }

  return null;
}
