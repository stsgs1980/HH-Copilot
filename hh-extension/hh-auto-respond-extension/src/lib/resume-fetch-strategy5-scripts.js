/**
 * Strategy 5: Script JSON experience parsing (orchestrator).
 *
 * Try to extract experience data from Magritte <script> hydration JSON.
 * hh.ru embeds ALL resume data in <script> tags for React hydration.
 * The SSR HTML only renders 3 company-cards, but the script state
 * may contain the FULL experience list for client-side "Развернуть" expansion.
 *
 * Looks in multiple script locations:
 * 1. <script type="application/json"> -- Magritte component state
 * 2. <script> with window.__INITIAL_STATE__ or __PRELOADED_STATE__
 * 3. <script> with BEM blocks containing experience data
 * 4. Raw HTML search for JSON patterns with experience arrays
 *
 * Scanners are in resume-fetch-strategy5-scanners.js
 */
import { createLogger } from './anti-hallucination.js';
import { findExperienceInObject } from './resume-fetch-json-utils.js';
import {
  extractExperienceFromStructuredJson,
  extractExperienceFromArray,
  deepScanForExperience
} from './resume-fetch-strategy5-scanners.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Parse experience from Magritte <script> hydration JSON.
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @returns {Array} Parsed experience entries
 */
export function parseExperienceFromScripts(doc, html) {
  const entries = [];

  // -- Pass 1: Look for structured JSON in script tags --
  const scripts = doc.querySelectorAll('script[type="application/json"], script:not([src])');
  for (const script of scripts) {
    const text = script.textContent || '';
    if (text.length < 100) continue;

    // Check if this script contains experience-related data
    if (!/experience|работ[аеы]|компани|должност|career|position/i.test(text)) continue;

    fetchLog.info('Strategy 5: examining script (' + text.length + ' chars, first 300: ' +
      text.substring(0, 300).replace(/\n/g, ' '));

    // Try multiple JSON extraction approaches
    const fromStructured = extractExperienceFromStructuredJson(text);
    if (fromStructured.length > 0) {
      fetchLog.info('Strategy 5: found ' + fromStructured.length + ' from structured JSON');
      return fromStructured;
    }

    // Try to find experience array in any JSON-like structure
    const fromArray = extractExperienceFromArray(text);
    if (fromArray.length > 0) {
      fetchLog.info('Strategy 5: found ' + fromArray.length + ' from JSON array scan');
      return fromArray;
    }
  }

  // -- Pass 2: Look for window.__INITIAL_STATE__ or __PRELOADED_STATE__ --
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
    /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/,
  ];

  for (const pat of statePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const state = JSON.parse(m[1]);
        const exp = findExperienceInObject(state, 0);
        if (exp && exp.length > 0) {
          fetchLog.info('Strategy 5: found ' + exp.length + ' from window state');
          return exp;
        }
      } catch (e) {
        fetchLog.info('Strategy 5: state JSON parse failed: ' + e.message);
      }
    }
  }

  // -- Pass 3: Look for "resumeStore" or "resume" patterns in raw HTML --
  const storePatterns = [
    /"resumeStore"\s*:\s*(\{[\s\S]+?\})\s*[,}]/,
    /"resume"\s*:\s*(\{[\s\S]{0,50000}?"experience"\s*:\s*\[[\s\S]+?\])\s*[,}]/,
  ];

  for (const pat of storePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const store = JSON.parse(m[1]);
        const exp = findExperienceInObject(store, 0);
        if (exp && exp.length > 0) {
          fetchLog.info('Strategy 5: found ' + exp.length + ' from store pattern');
          return exp;
        }
      } catch (e) {
        fetchLog.info('Strategy 5: store JSON parse failed: ' + e.message);
      }
    }
  }

  // -- Pass 4: Deep scan -- find ANY JSON array containing objects with date fields --
  const deepScan = deepScanForExperience(html);
  if (deepScan.length > 0) {
    fetchLog.info('Strategy 5: found ' + deepScan.length + ' from deep scan');
    return deepScan;
  }

  return entries;
}
