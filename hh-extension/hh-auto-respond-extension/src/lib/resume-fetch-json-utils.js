/**
 * JSON utility functions for extracting experience data from structured JSON.
 * Used by Strategy 5 (script JSON parsing) and Strategy 6 (API responses).
 */
import { createLogger } from './anti-hallucination.js';

const _fetchLog = createLogger('ResumeFetch');

/**
 * Extract a JSON array starting at startIdx from text.
 * Handles nested brackets properly.
 * @param {string} text - Source text
 * @param {number} startIdx - Index of the opening '['
 * @returns {string|null} JSON array string or null
 */
export function extractJsonArray(text, startIdx) {
  if (text[startIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"' && !escapeNext) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0) return text.substring(startIdx, i + 1);
  }
  return null;
}

/**
 * Extract JSON array from raw HTML starting at a given position.
 * More robust than extractJsonArray because it handles HTML entities and
 * truncated JSON.
 * @param {string} html - Raw HTML string
 * @param {number} startIdx - Index of the opening '['
 * @returns {string|null} JSON array string or null
 */
export function extractJsonArrayFromHtml(html, startIdx) {
  if (startIdx >= html.length || html[startIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  for (let i = startIdx; i < html.length && i < startIdx + 500000; i++) {
    const ch = html[i];
    if (ch === '"' && (i === 0 || html[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0) return html.substring(startIdx, i + 1);
  }
  return null;
}

/**
 * Build an experience entry object from an API item.
 * Handles hh.ru API field formats.
 * @param {object} item - API item with position, company, start, end, etc.
 * @returns {object} Normalized experience entry { position, company, period, description }
 */
export function buildEntryFromApiItem(item) {
  const job = {};
  // hh.ru API fields
  if (item.position) job.position = item.position;
  if (item.name && !job.position) job.position = item.name;
  if (item.company) job.company = typeof item.company === 'string' ? item.company : item.company?.name || '';
  if (item.organization && !job.company) job.company = item.organization;
  if (item.start || item.startDate) {
    const start = item.start || item.startDate;
    const isCurrent = !!(item.current || item.untilNow);
    const rawEnd = item.end || item.endDate;
    const end = rawEnd || (isCurrent ? 'настоящее время' : '');
    if (typeof start === 'string') {
      job.period = start + ' -- ' + end;
    } else if (start && start.year) {
      const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
      const startStr = (start.month ? months[start.month - 1] + ' ' : '') + start.year;
      let endStr = 'настоящее время';
      if (end && typeof end === 'object' && end.year) {
        endStr = (end.month ? months[end.month - 1] + ' ' : '') + end.year;
      } else if (end && typeof end === 'string' && end.length > 0) {
        endStr = end;
      }
      job.period = startStr + ' -- ' + endStr;
    }
  }
  if (item.description) job.description = item.description;
  return job;
}

/**
 * Recursively search an object for an array containing experience-like objects.
 * @param {object} obj - Object to search
 * @param {number} depth - Current recursion depth (max 6)
 * @returns {Array|null} Experience entries array or null
 */
export function findExperienceInObject(obj, depth) {
  if (depth > 6 || !obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
      const first = obj[0];
      if (first.position || first.company || first.startDate ||
          first.start || first.organization) {
        const entries = [];
        obj.forEach(item => {
          const job = buildEntryFromApiItem(item);
          if (job.position || job.company) entries.push(job);
        });
        return entries.length > 0 ? entries : null;
      }
    }
    return null;
  }
  // Prioritize known keys
  const priorityKeys = ['experience', 'jobs', 'positions', 'career', 'workHistory'];
  for (const key of priorityKeys) {
    if (obj[key]) {
      const result = findExperienceInObject(obj[key], depth + 1);
      if (result) return result;
    }
  }
  for (const key of Object.keys(obj)) {
    if (priorityKeys.includes(key)) continue;
    const result = findExperienceInObject(obj[key], depth + 1);
    if (result) return result;
  }
  return null;
}
