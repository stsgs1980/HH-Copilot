/**
 * Strategy 5 JSON scanners — experience extraction from various JSON patterns.
 *
 * Split from resume-fetch-strategy5-scripts.js for modularity.
 * Contains the three JSON scanning approaches used by Strategy 5:
 *   1. Structured JSON ("experience":[...])
 *   2. Array scan (flexible [{...}] with experience fields)
 *   3. Deep scan (raw HTML — last resort)
 */
import { createLogger } from './anti-hallucination.js';
import { extractJsonArray, extractJsonArrayFromHtml, buildEntryFromApiItem } from './resume-fetch-json-utils.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Extract experience from structured JSON patterns.
 * Looks for "experience":[...] pattern and parses the array.
 * @param {string} text - Script text content
 * @returns {Array} Parsed experience entries
 */
export function extractExperienceFromStructuredJson(text) {
  const entries = [];

  const expMatch = text.match(/"experience"\s*:\s*\[/);
  if (expMatch) {
    const startIdx = text.indexOf('[', expMatch.index + 12);
    if (startIdx !== -1) {
      const jsonStr = extractJsonArray(text, startIdx);
      if (jsonStr) {
        try {
          const expArray = JSON.parse(jsonStr);
          if (Array.isArray(expArray)) {
            expArray.forEach(item => {
              const job = buildEntryFromApiItem(item);
              if (job.position || job.company) entries.push(job);
            });
            if (entries.length > 0) return entries;
          }
        } catch (e) {
          fetchLog.info('Strategy 5: structured JSON parse failed: ' + e.message);
        }
      }
    }
  }

  return entries;
}

/**
 * Scan text for JSON arrays containing objects with experience-like properties.
 * Uses a more flexible approach than structured parsing.
 * @param {string} text - Script text content
 * @returns {Array} Parsed experience entries
 */
export function extractExperienceFromArray(text) {
  const entries = [];

  let searchFrom = 0;
  while (searchFrom < text.length) {
    const arrStart = text.indexOf('[{', searchFrom);
    if (arrStart === -1) break;

    const jsonStr = extractJsonArray(text, arrStart);
    if (!jsonStr || jsonStr.length < 50 || jsonStr.length > 200000) {
      searchFrom = arrStart + 2;
      continue;
    }

    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr) || arr.length === 0) {
        searchFrom = arrStart + 2;
        continue;
      }

      const firstItem = arr[0];
      if (firstItem && typeof firstItem === 'object') {
        const hasExpFields = firstItem.position || firstItem.company ||
          firstItem.startDate || firstItem.start || firstItem.organization ||
          firstItem.name && (firstItem.start || firstItem.startDate);

        if (hasExpFields) {
          arr.forEach(item => {
            const job = buildEntryFromApiItem(item);
            if (job.position || job.company) entries.push(job);
          });
          if (entries.length > 0) return entries;
        }
      }
    } catch (e) {
      // Not valid JSON, continue
    }

    searchFrom = arrStart + 2;
  }

  return entries;
}

/**
 * Deep scan raw HTML for JSON arrays containing objects with date-like properties.
 * This is the last resort — looks for ANY array of objects that have
 * recognizable date fields (year, month, start, end).
 * @param {string} html - Raw HTML string
 * @returns {Array} Parsed experience entries
 */
export function deepScanForExperience(html) {
  const entries = [];

  const yearArrayPattern = /\[\{[^]]*?"year"\s*:\s*\d{4}[^]]*?\}/g;
  let match;
  while ((match = yearArrayPattern.exec(html)) !== null) {
    const startIdx = match.index;
    let arrStart = startIdx;
    while (arrStart > 0 && html[arrStart - 1] !== '[') arrStart--;
    if (html[arrStart] !== '[') continue;

    const jsonStr = extractJsonArrayFromHtml(html, arrStart);
    if (!jsonStr) continue;

    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const hasDates = arr.some(item =>
        item.year || item.start?.year || item.startDate?.year ||
        item.end?.year || item.endDate?.year
      );
      if (!hasDates) continue;

      const hasExpFields = arr.some(item =>
        item.position || item.company || item.name ||
        item.organization || item.title
      );
      if (!hasExpFields) continue;

      arr.forEach(item => {
        const job = buildEntryFromApiItem(item);
        if (job.position || job.company) entries.push(job);
      });
      if (entries.length > 0) return entries;
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  return entries;
}
