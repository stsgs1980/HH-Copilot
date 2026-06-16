/**
 * LIB: RESUME FETCH HELPERS
 * ============================
 * Core fetch utilities and resume link extractors.
 *
 * MAGRITTE AWARENESS:
 *   - hh.ru uses Magritte (React SSR + hydration)
 *   - data-qa attributes are stable; CSS classes are hashed and unreliable
 */

import { createLogger } from './anti-hallucination.js';
import { MIN_HASH_LEN, cleanResumeTitle, VISIBILITY_UNKNOWN, detectVisibilityFromLinkText } from './resume-constants.js';

const helperLog = createLogger('ResumeFetchH');

// ===============================================
// FETCH HELPERS
// ===============================================

/**
 * Fetch HTML content from a URL with credentials (for hh.ru authenticated pages).
 * @param {string} url - Full URL to fetch
 * @returns {Promise<string>} HTML text content
 */
export async function fetchHtml(url) {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: { 'Accept': 'text/html' }
  });
  if (!resp.ok) throw new Error('fetch ' + url + ' -> ' + resp.status);
  return resp.text();
}

/**
 * Parse an HTML string into a Document using DOMParser.
 * @param {string} html - Raw HTML string
 * @returns {Document} Parsed DOM document
 */
export function htmlToDoc(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * Safely extract text content from a DOM element.
 * @param {Element|null} el - DOM element
 * @param {string} [fallback=''] - Fallback value if element is null or empty
 * @returns {string} Trimmed text content or fallback
 */
export function safeGetText(el, fallback) {
  fallback = fallback || '';
  if (!el || !(el instanceof Element)) return fallback;
  // textContent converts HTML entities (\u00A0 for &nbsp;) to chars.
  // Also normalize any remaining non-breaking spaces to regular spaces.
  let text = (el.textContent || '').trim();
  text = text.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  return text.length > 0 ? text : fallback;
}

// ===============================================
// RESUME LINK EXTRACTORS
// ===============================================

/**
 * Extract resume links from a list of anchor elements on /applicant/resumes page.
 * Detects visibility from link text (Strategy 0): hidden resumes include
 * "Многие не видят ваше резюме" directly in the link's textContent.
 *
 * @param {NodeListOf<HTMLAnchorElement>} anchorList - Anchor elements from the page
 * @returns {Array<{id: string, title: string, url: string, visibility: string, hidden: boolean}>}
 */
export function extractResumeLinks(anchorList) {
  const resumes = [];

  anchorList.forEach(link => {
    const href = link.getAttribute('href') || '';

    // /resume/{hex} (public/employer view)
    let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
    // /applicant/resumes/view?resume={hex} (applicant's own view)
    if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
    if (!hashMatch) return;

    const id = hashMatch[1];
    if (id.length < MIN_HASH_LEN) return;
    if (resumes.find(r => r.id === id)) return;

    const rawLinkText = link.textContent || '';

    // Strategy 0: Detect visibility from the link's raw textContent.
    const vis = detectVisibilityFromLinkText(rawLinkText);
    const title = cleanResumeTitle(rawLinkText);
    const resumeUrl = 'https://hh.ru/applicant/resumes/view?resume=' + id;

    resumes.push({ id, title, url: resumeUrl, visibility: vis.visibility, hidden: vis.hidden });

    if (vis.visibility !== VISIBILITY_UNKNOWN) {
      helperLog.info('LinkText visibility: ' + id.substring(0, 8) + '=' + vis.visibility +
        ' (method=' + vis.method + ', title="' + title.substring(0, 30) + '")');
    }
  });
  return resumes;
}

/**
 * Extract resume IDs from <script> tags and JSON state patterns.
 * @param {Document} doc - Parsed document
 * @param {string} html - Raw HTML string
 * @returns {Array<{id: string, title: string, url: string}>} Resume stubs (no visibility)
 */
export function extractFromScripts(doc, html) {
  const resumes = [];
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const text = script.textContent || '';
    const matches = text.matchAll(/resume[=/]\\?"?([a-f0-9]{32,})/g);
    for (const m of matches) {
      const id = m[1];
      if (!resumes.find(r => r.id === id)) {
        resumes.push({
          id,
          title: 'Resume ' + id.substring(0, 8),
          url: 'https://hh.ru/applicant/resumes/view?resume=' + id
        });
      }
    }
  });
  // Search raw HTML for JSON/state patterns
  if (resumes.length === 0) {
    const jsonMatches = html.matchAll(/"resumeId"\s*:\s*"([a-f0-9]+)"/g);
    for (const m of jsonMatches) {
      const id = m[1];
      if (!resumes.find(r => r.id === id)) {
        resumes.push({
          id,
          title: 'Resume ' + id.substring(0, 8),
          url: 'https://hh.ru/applicant/resumes/view?resume=' + id
        });
      }
    }
  }
  if (resumes.length > 0) {
    helperLog.info('Found ' + resumes.length + ' resumes from script/JSON data');
  }
  return resumes;
}
