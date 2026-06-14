/**
 * Resume list fetching -- fetches and parses /applicant/resumes page.
 */
import { createLogger } from './anti-hallucination.js';
import { fetchHtml, htmlToDoc, extractResumeLinks, extractFromScripts } from './resume-fetch-helpers.js';
import { extractVisibilityStatus } from './resume-fetch-list-vis.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Fetch the resume list from /applicant/resumes.
 * @returns {Array} Array of resume objects with url, title, visibility, etc.
 */
export async function fetchResumeList() {
  fetchLog.info('Fetching /applicant/resumes ...');
  let html;
  try {
    html = await fetchHtml('https://hh.ru/applicant/resumes');
  } catch (err) {
    fetchLog.error('Failed to fetch /applicant/resumes: ' + err.message);
    return [];
  }

  // Check if we got a login redirect (HTML too short = likely redirect page)
  if (!html || html.length < 500) {
    fetchLog.warn('Got very short response (' + (html ? html.length : 0) + ' chars), likely redirect');
    return [];
  }

  const doc = htmlToDoc(html);
  const allAnchors = doc.querySelectorAll('a[href]');
  fetchLog.info('Fetched HTML: ' + html.length + ' chars, ' + allAnchors.length + ' links');

  const resumes = extractResumeLinks(allAnchors);

  // Extract visibility status from raw HTML (proximity-based, not fragile DOM walking)
  extractVisibilityStatus(doc, resumes, html);

  // Fallback: try to find resume IDs in embedded script data (BEM/React hydration)
  if (resumes.length === 0) {
    fetchLog.info('No links found, trying embedded script data...');
    const scriptResumes = extractFromScripts(doc, html);
    if (scriptResumes.length > 0) return scriptResumes;
  }

  // Fallback: try parsing current page DOM if we're on /applicant/resumes
  if (resumes.length === 0 && window.location.pathname.includes('/applicant/resumes')) {
    fetchLog.info('No links from fetch, trying current page DOM...');
    const domLinks = document.querySelectorAll('a[href]');
    const domResumes = extractResumeLinks(domLinks);
    if (domResumes.length > 0) {
      fetchLog.info('Found ' + domResumes.length + ' resumes from current page DOM');
      return domResumes;
    }
  }

  fetchLog.info('Resume list: ' + resumes.length + ' resumes found');
  return resumes;
}
