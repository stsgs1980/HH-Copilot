/**
 * List-level visibility extraction.
 * Detects visibility from the resume LIST page HTML (e.g. /applicant/resumes).
 * Less reliable than page-level detection but runs first as a fast pre-check.
 *
 * Split from resume-fetch-helpers.js for anti-monolith compliance.
 * Strategies 2 & 3 are in resume-fetch-list-vis-strategies.js.
 */
import { createLogger } from './anti-hallucination.js';
import {
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  HIDDEN_INDICATORS, RESUME_CARD_SELECTORS,
  detectVisibilityFromCard,
  hasHiddenIndicator, normalizeWs, stripScripts
} from './resume-constants.js';
import { extractVisibilityFromScripts, runProximitySearch } from './resume-fetch-list-vis-strategies.js';

const visLog = createLogger('ResumeFetchH');

/**
 * Extract visibility status using multiple strategies.
 *
 * Strategy 0: Check resumes already detected by extractResumeLinks
 * Strategy 1: data-qa card containers in the parsed Document
 * Strategy 2: Magritte script/hydration state (in resume-fetch-list-vis-strategies.js)
 * Strategy 3: Proximity search with <script> stripping (in resume-fetch-list-vis-strategies.js)
 *
 * @param {Document} doc - Parsed document from DOMParser
 * @param {Array} resumes - Resume objects (visibility will be set in-place)
 * @param {string} html - Raw HTML string
 */
export function extractVisibilityStatus(doc, resumes, html) {
  if (resumes.length === 0) return;
  if (!html) {
    visLog.warn('extractVisibilityStatus: no raw HTML provided, skipping');
    return;
  }

  const htmlLower = html.toLowerCase();

  // ═══ STRATEGY 0: Check resumes already detected by extractResumeLinks ═══
  let alreadyDetected = 0;
  let needDetection = 0;
  resumes.forEach(r => {
    if (r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE) alreadyDetected++;
    else needDetection++;
  });

  // Debug: log raw link text for each resume
  resumes.forEach(r => {
    const link = Array.from(doc.querySelectorAll('a[href]')).find(a => {
      const h = a.getAttribute('href') || '';
      return h.includes(r.id);
    });
    if (link) {
      const raw = link.textContent || '';
      const norm = normalizeWs(raw);
      const hasInd = hasHiddenIndicator(raw);
      visLog.info('  DEBUG ' + r.id.substring(0, 8) + ': rawLen=' + raw.length +
        ' hasNbsp=' + (raw.indexOf('\u00A0') !== -1) +
        ' normalized="' + norm.substring(0, 80) + '"' +
        ' hasHidden=' + hasInd + ' vis=' + r.visibility);
    }
  });

  visLog.info('Visibility scan: ' + resumes.length + ' resumes (' +
    alreadyDetected + ' already from link text, ' + needDetection + ' need detection)');

  if (needDetection === 0) {
    visLog.info('All resumes already detected from link text -- skipping other strategies');
    logVisibilitySummary(resumes);
    return;
  }

  // Quick check: do hidden indicators exist ANYWHERE in the HTML?
  const globalIndicators = HIDDEN_INDICATORS.map(ind => ({ text: ind, pos: htmlLower.indexOf(ind) }));
  const hasAnyIndicators = globalIndicators.some(i => i.pos !== -1);
  visLog.info('Indicators in HTML: ' + (hasAnyIndicators
    ? globalIndicators.filter(i => i.pos !== -1).map(i => '"' + i.text + '"@' + i.pos).join(', ')
    : 'NONE FOUND'));

  // ═══ STRATEGY 1: data-qa card containers ═══
  let strategyUsed = false;
  for (const sel of RESUME_CARD_SELECTORS) {
    const cards = doc.querySelectorAll(sel);
    if (cards.length === 0) continue;
    visLog.info('Strategy 1: Found ' + cards.length + ' cards with selector: ' + sel);
    let matched = 0;
    cards.forEach(card => {
      const link = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
      if (!hashMatch) return;
      const id = hashMatch[1];
      const resume = resumes.find(r => r.id === id);
      if (!resume || resume.visibility !== VISIBILITY_UNKNOWN) return;
      const result = detectVisibilityFromCard(card);
      resume.visibility = result.visibility;
      resume.hidden = result.hidden;
      matched++;
      visLog.info('  Card: ' + id.substring(0, 8) + '=' + result.visibility + ' (method=' + result.method + ')');
    });
    if (matched > 0) {
      visLog.info('Strategy 1: matched ' + matched + '/' + needDetection + ' unknown resumes via data-qa cards');
      break;
    }
  }

  const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
  if (stillUnknown === 0) strategyUsed = true;
  else if (!strategyUsed) visLog.info('Strategy 1: no data-qa cards matched, trying next strategy');

  // ═══ STRATEGY 2: Script/hydration state ═══
  if (!strategyUsed) {
    const scriptResult = extractVisibilityFromScripts(doc, resumes, html);
    if (scriptResult) {
      visLog.info('Strategy 2: found visibility in script/hydration state');
      strategyUsed = true;
    }
  }

  // ═══ STRATEGY 3: Proximity search with script stripping ═══
  if (!strategyUsed) {
    runProximitySearch(resumes, html);
    strategyUsed = true;
  }

  // NO FINAL FALLBACK: Keep UNKNOWN as UNKNOWN — detail page will resolve
  const unknownAfterAll = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
  if (unknownAfterAll.length > 0) {
    visLog.info('[VIS-DIAG] List: ' + unknownAfterAll.length + ' resumes still UNKNOWN -- will be resolved by detail page detection');
    unknownAfterAll.forEach(r => {
      visLog.info('[VIS-DIAG]   List: ' + r.id.substring(0, 8) + ' "' + (r.title || '').substring(0, 30) + '" -> ' + r.visibility);
    });
  }

  logVisibilitySummary(resumes);
}

function logVisibilitySummary(resumes) {
  const summary = resumes.map(r => r.id.substring(0, 8) + '=' + r.visibility).join(', ');
  visLog.info('Visibility result: [' + summary + ']');
}
