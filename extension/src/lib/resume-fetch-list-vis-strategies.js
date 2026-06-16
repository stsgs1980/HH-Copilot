/**
 * List-level visibility -- Strategy 2 & 3
 * =========================================
 * Script/hydration state extraction and proximity search strategies.
 * Split from resume-fetch-list-vis.js for anti-monolith compliance.
 */

import { createLogger } from './anti-hallucination.js';
import {
  VISIBILITY_UNKNOWN, VISIBILITY_HIDDEN,
  HIDDEN_INDICATORS, VISIBILITY_HIDDEN_DATA_QA,
  hasHiddenIndicator, stripScripts
} from './resume-constants.js';

const visLog = createLogger('ResumeFetchH');

// -- Strategy 2: Script/hydration state --

/**
 * Extract visibility from script/hydration state in HTML.
 * Looks for "hidden":true patterns in JSON near resume hashes,
 * and data-qa="resume-status-hidden" in raw HTML.
 * @returns {boolean} true if any visibility was found
 */
export function extractVisibilityFromScripts(doc, resumes, html) {
  let found = false;

  // Pattern 1: Look for "hidden":true/false in JSON near resume hash
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const text = script.textContent || '';
    if (!text || text.length < 100) return;
    resumes.forEach(r => {
      if (r.visibility !== VISIBILITY_UNKNOWN) return;
      const hashIdx = text.indexOf(r.id);
      if (hashIdx === -1) return;
      const nearby = text.substring(Math.max(0, hashIdx - 200), Math.min(text.length, hashIdx + 500));
      if (/"hidden"\s*:\s*true/.test(nearby) || /"visibility"\s*:\s*"hidden"/.test(nearby) ||
          /"status"\s*:\s*"hidden"/.test(nearby) || /"isHidden"\s*:\s*true/.test(nearby)) {
        r.visibility = VISIBILITY_HIDDEN;
        r.hidden = true;
        found = true;
        visLog.info('  Script visibility: ' + r.id.substring(0, 8) + '=hidden (JSON pattern)');
      }
    });
  });

  // Pattern 2: Look for data-qa="resume-status-hidden" in raw HTML
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const qaMatch = sel.match(/data-qa="([^"]+)"/) || sel.match(/data-qa\*="([^"]+)"/);
    if (!qaMatch) continue;
    const qaValue = qaMatch[1];
    const qaPattern = 'data-qa="' + qaValue;
    const qaIdx = findAllPositions(html, qaPattern);
    if (qaIdx.length > 0) {
      visLog.info('  Found data-qa="' + qaValue + '" at positions: ' + qaIdx.join(', '));
      qaIdx.forEach(pos => {
        const before = html.substring(Math.max(0, pos - 3000), pos).toLowerCase();
        let nearestId = null;
        let nearestDist = Infinity;
        resumes.forEach(r => {
          const idx = before.lastIndexOf(r.id.toLowerCase());
          if (idx !== -1 && (before.length - idx) < nearestDist) {
            nearestDist = before.length - idx;
            nearestId = r;
          }
        });
        if (nearestId && nearestId.visibility === VISIBILITY_UNKNOWN) {
          nearestId.visibility = VISIBILITY_HIDDEN;
          nearestId.hidden = true;
          found = true;
          visLog.info('  data-qa visibility: ' + nearestId.id.substring(0, 8) + '=hidden');
        }
      });
    }
  }

  return found;
}

// -- Strategy 3: Proximity search with script stripping --

const SEARCH_RADIUS = 5000;

/**
 * Run proximity search: strip scripts, find hidden indicators near each resume hash.
 */
export function runProximitySearch(resumes, html) {
  visLog.info('Strategy 3: proximity search with <script> stripping');
  const cleanHtml = stripScripts(html);
  const cleanLower = cleanHtml.toLowerCase();
  const cleanForSearch = cleanLower.replace(/&nbsp;/g, ' ');

  const cleanIndicators = HIDDEN_INDICATORS.map(ind => ({ text: ind, pos: cleanForSearch.indexOf(ind) }));
  const hasCleanIndicators = cleanIndicators.some(i => i.pos !== -1);
  visLog.info('  Cleaned HTML: ' + cleanHtml.length + ' chars (was ' + html.length +
    '), indicators: ' + (hasCleanIndicators
      ? cleanIndicators.filter(i => i.pos !== -1).map(i => '"' + i.text + '"@' + i.pos).join(', ')
      : 'NONE'));

  const hashPositions = resumes.map(r => {
    const pos = cleanLower.indexOf(r.id.toLowerCase());
    return { id: r.id, pos };
  }).filter(h => h.pos !== -1).sort((a, b) => a.pos - b.pos);

  if (hashPositions.length > 0) {
    visLog.info('  Hash positions in cleaned HTML: ' +
      hashPositions.map(h => h.id.substring(0, 8) + '@' + h.pos).join(', '));
  }

  resumes.forEach(r => {
    if (r.visibility !== VISIBILITY_UNKNOWN) return;
    const myPos = cleanForSearch.indexOf(r.id.toLowerCase());
    if (myPos === -1) {
      visLog.info('  ' + r.id.substring(0, 8) + ': hash not found in cleaned HTML');
      return;
    }
    const nextResume = hashPositions.find(h => h.pos > myPos && h.id !== r.id);
    const boundary = nextResume ? nextResume.pos : cleanForSearch.length;
    const searchStart = Math.max(0, myPos - 500);
    const searchEnd = Math.min(myPos + SEARCH_RADIUS, boundary);
    const zone = cleanForSearch.substring(searchStart, searchEnd);
    const isHidden = hasHiddenIndicator(zone);
    r.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_UNKNOWN;
    r.hidden = isHidden;
    visLog.info('  ' + r.id.substring(0, 8) + '=' + r.visibility +
      ' (zone ' + searchStart + '-' + searchEnd +
      ', next=' + (nextResume ? nextResume.id.substring(0, 8) : 'none') +
      ', indicators=' + (isHidden ? 'FOUND' : 'none') + ')');
  });
}

// -- Utility --

function findAllPositions(html, pattern) {
  const positions = [];
  const lower = html.toLowerCase();
  let idx = 0;
  while ((idx = lower.indexOf(pattern, idx)) !== -1) {
    positions.push(idx);
    idx += pattern.length;
  }
  return positions;
}
