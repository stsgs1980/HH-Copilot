/**
 * LIB: RESUME FETCH HELPERS
 * ============================
 * Shared helpers for fetch-based resume parsing.
 *
 * MAGRITTE AWARENESS:
 *   - hh.ru uses Magritte (React SSR + hydration)
 *   - Resume hash may appear in <script> (hydration state) BEFORE the card HTML
 *   - Proximity search MUST strip scripts or it looks at the wrong zone
 *   - data-qa attributes are stable; CSS classes are hashed and unreliable
 */

import { createLogger } from './anti-hallucination.js';
import {
  MIN_HASH_LEN, cleanResumeTitle,
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  HIDDEN_INDICATORS, RESUME_CARD_SELECTORS, VISIBILITY_HIDDEN_DATA_QA,
  detectVisibilityFromCard, detectVisibilityFromLinkText,
  hasHiddenIndicator, normalizeWs, stripScripts
} from './resume-constants.js';

const helperLog = createLogger('ResumeFetchH');

// ═══════════════════════════════════════════════
// FETCH HELPERS
// ═══════════════════════════════════════════════

/**
 * Fetch HTML content from a URL with credentials (for hh.ru authenticated pages).
 * @param {string} url - Full URL to fetch
 * @returns {Promise<string>} HTML text content
 * @throws {Error} If fetch fails or returns non-OK status
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
  const text = (el.textContent || '').trim();
  return text.length > 0 ? text : fallback;
}

// ═══════════════════════════════════════════════
// RESUME LINK EXTRACTORS
// ═══════════════════════════════════════════════

/**
 * Extract resume links from a list of anchor elements on /applicant/resumes page.
 *
 * Matches two URL patterns:
 *   - /resume/{hex} — public/employer view
 *   - ?resume={hex} — applicant's own resume list
 *
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
    // Skip short hashes -- they are not real resume IDs
    if (id.length < MIN_HASH_LEN) return;
    if (resumes.find(r => r.id === id)) return;

    const rawLinkText = link.textContent || '';

    // Strategy 0: Detect visibility from the link's raw textContent.
    // In Magritte, hidden resumes include "Многие не видят ваше резюме"
    // directly inside the link text. This is the MOST RELIABLE method.
    const vis = detectVisibilityFromLinkText(rawLinkText);
    const visibility = vis.visibility;
    const hidden = vis.hidden;

    // Extract clean title from link text using shared logic
    const title = cleanResumeTitle(rawLinkText);

    const resumeUrl = 'https://hh.ru/applicant/resumes/view?resume=' + id;
    resumes.push({ id, title, url: resumeUrl, visibility, hidden });

    if (visibility !== VISIBILITY_UNKNOWN) {
      helperLog.info('LinkText visibility: ' + id.substring(0, 8) + '=' + visibility +
        ' (method=' + vis.method + ', title="' + title.substring(0, 30) + '")');
    }
  });
  return resumes;
}

/**
 * Extract resume IDs from <script> tags and JSON state patterns.
 *
 * Two-phase extraction:
 *   Phase 1: Regex scan of script textContent for resume hash patterns
 *   Phase 2: Search raw HTML for "resumeId":"HASH" JSON patterns
 *
 * @param {Document} doc - Parsed document
 * @param {string} html - Raw HTML string
 * @returns {Array<{id: string, title: string, url: string}>} Resume stubs (no visibility)
 */
export function extractFromScripts(doc, html) {
  const resumes = [];
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const text = script.textContent || '';
    // NOTE: {32,} here vs MIN_HASH_LEN (30) in constants — scripts tend to have longer hashes
    // because they are full database IDs, not truncated URL paths
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

// ═══════════════════════════════════════════════
// VISIBILITY DETECTION (Magritte-aware)
// ═══════════════════════════════════════════════

const SEARCH_RADIUS = 5000; // chars after the resume hash to search for visibility indicators (empirically: indicators usually within 5K chars of card)

/**
 * Extract visibility status using multiple strategies.
 *
 * Strategy 1: data-qa card containers in the parsed Document
 *   - Find [data-qa="resume-list-item"] etc. for each resume
 *   - Check card text content for hidden indicators
 *   - Most reliable for Magritte SSR HTML
 *
 * Strategy 2: Magritte script/hydration state
 *   - Look for JSON state in <script> tags that contains resume visibility
 *   - Many Magritte pages serialize component state including hidden status
 *
 * Strategy 3: Proximity search with <script> stripping
 *   - Strip all <script> blocks from HTML first
 *   - Then find hash positions and search for indicators nearby
 *   - Avoids the bug where indexOf finds hash in hydration <script> first
 *
 * @param {Document} doc - Parsed document from DOMParser
 * @param {Array} resumes - Resume objects (visibility will be set in-place)
 * @param {string} html - Raw HTML string
 */
export function extractVisibilityStatus(doc, resumes, html) {
  if (resumes.length === 0) return;
  if (!html) {
    helperLog.warn('extractVisibilityStatus: no raw HTML provided, skipping');
    return;
  }

  const htmlLower = html.toLowerCase();

  // ═══ STRATEGY 0: Check resumes already detected by extractResumeLinks ═══
  // extractResumeLinks() sets visibility from link.textContent (most reliable)
  // CRITICAL: It uses hasHiddenIndicator() which normalizes &nbsp; first
  let alreadyDetected = 0;
  let needDetection = 0;
  resumes.forEach(r => {
    if (r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE) {
      alreadyDetected++;
    } else {
      needDetection++;
    }
  });

  // DEBUG: Log raw link text for each resume so we can see exactly what's there
  resumes.forEach(r => {
    const link = Array.from(doc.querySelectorAll('a[href]')).find(a => {
      const h = a.getAttribute('href') || '';
      return h.includes(r.id);
    });
    if (link) {
      const raw = link.textContent || '';
      const norm = normalizeWs(raw);
      const hasInd = hasHiddenIndicator(raw);
      helperLog.info('  DEBUG ' + r.id.substring(0, 8) + ': rawLen=' + raw.length +
        ' hasNbsp=' + (raw.indexOf('\u00A0') !== -1) +
        ' normalized="' + norm.substring(0, 80) + '"' +
        ' hasHidden=' + hasInd +
        ' vis=' + r.visibility);
    }
  });

  helperLog.info('Visibility scan: ' + resumes.length + ' resumes (' +
    alreadyDetected + ' already from link text, ' + needDetection + ' need detection)');

  if (needDetection === 0) {
    helperLog.info('All resumes already detected from link text — skipping other strategies');
    const summary = resumes.map(r =>
      r.id.substring(0, 8) + '=' + r.visibility
    ).join(', ');
    helperLog.info('Visibility result: [' + summary + ']');
    return;
  }

  // Quick check: do hidden indicators exist ANYWHERE in the HTML?
  const globalIndicators = HIDDEN_INDICATORS.map(ind => ({
    text: ind,
    pos: htmlLower.indexOf(ind)
  }));
  const hasAnyIndicators = globalIndicators.some(i => i.pos !== -1);
  helperLog.info('Indicators in HTML: ' + (hasAnyIndicators
    ? globalIndicators.filter(i => i.pos !== -1).map(i => '"' + i.text + '"@' + i.pos).join(', ')
    : 'NONE FOUND'));

  // ═══ STRATEGY 1: data-qa card containers ═══
  let strategyUsed = false;
  for (const sel of RESUME_CARD_SELECTORS) {
    const cards = doc.querySelectorAll(sel);
    if (cards.length === 0) continue;

    helperLog.info('Strategy 1: Found ' + cards.length + ' cards with selector: ' + sel);
    let matched = 0;

    cards.forEach(card => {
      // Find resume link inside this card
      const link = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
      if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
      if (!hashMatch) return;

      const id = hashMatch[1];
      const resume = resumes.find(r => r.id === id);
      if (!resume) return;
      if (resume.visibility !== VISIBILITY_UNKNOWN) return; // already detected

      // Use shared visibility detection (data-qa + text)
      const result = detectVisibilityFromCard(card);
      resume.visibility = result.visibility;
      resume.hidden = result.hidden;
      matched++;

      helperLog.info('  Card: ' + id.substring(0, 8) + '=' + result.visibility +
        ' (method=' + result.method + ', cardTextLen=' + (card.textContent || '').length + ')');
    });

    if (matched > 0) {
      helperLog.info('Strategy 1: matched ' + matched + '/' + needDetection + ' unknown resumes via data-qa cards');
      break;
    }
  }

  // Check if all resumes are now detected
  const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
  if (stillUnknown === 0) {
    strategyUsed = true;
  } else if (!strategyUsed) {
    helperLog.info('Strategy 1: no data-qa cards matched, trying next strategy');
  }

  // ═══ STRATEGY 2: Script/hydration state ═══
  if (!strategyUsed) {
    const scriptResult = extractVisibilityFromScripts(doc, resumes, html);
    if (scriptResult) {
      helperLog.info('Strategy 2: found visibility in script/hydration state');
      strategyUsed = true;
    }
  }

  // ═══ STRATEGY 3: Proximity search with script stripping ═══
  if (!strategyUsed) {
    helperLog.info('Strategy 3: proximity search with <script> stripping');

    // CRITICAL: strip <script> blocks first!
    // Magritte puts resume hashes in React hydration <script> which comes
    // BEFORE the actual card HTML. indexOf finds the script occurrence first,
    // and the proximity zone lands in script data instead of card HTML.
    const cleanHtml = stripScripts(html);
    const cleanLower = cleanHtml.toLowerCase();

    // Check if indicators exist in the cleaned HTML
    // CRITICAL: Also replace &nbsp; HTML entities with regular spaces before searching
    const cleanForSearch = cleanLower.replace(/&nbsp;/g, ' ');
    const cleanIndicators = HIDDEN_INDICATORS.map(ind => ({
      text: ind,
      pos: cleanForSearch.indexOf(ind)
    }));
    const hasCleanIndicators = cleanIndicators.some(i => i.pos !== -1);
    helperLog.info('  Cleaned HTML: ' + cleanHtml.length + ' chars (was ' + html.length +
      '), indicators: ' + (hasCleanIndicators
        ? cleanIndicators.filter(i => i.pos !== -1).map(i => '"' + i.text + '"@' + i.pos).join(', ')
        : 'NONE'));

    // Build sorted positions of all resume hashes in the CLEANED HTML
    const hashPositions = resumes.map(r => {
      const pos = cleanLower.indexOf(r.id.toLowerCase());
      return { id: r.id, pos };
    }).filter(h => h.pos !== -1).sort((a, b) => a.pos - b.pos);

    if (hashPositions.length > 0) {
      helperLog.info('  Hash positions in cleaned HTML: ' +
        hashPositions.map(h => h.id.substring(0, 8) + '@' + h.pos).join(', '));
    }

    resumes.forEach(r => {
      if (r.visibility !== VISIBILITY_UNKNOWN) return; // already detected by Strategy 0

      const myPos = cleanForSearch.indexOf(r.id.toLowerCase());
      if (myPos === -1) {
        helperLog.info('  ' + r.id.substring(0, 8) + ': hash not found in cleaned HTML');
        return;
      }

      // Find the start of the NEXT resume's section
      const nextResume = hashPositions.find(h => h.pos > myPos && h.id !== r.id);
      const boundary = nextResume ? nextResume.pos : cleanForSearch.length;

      // Search zone: from 500 chars before hash to boundary
      const searchStart = Math.max(0, myPos - 500);
      const searchEnd = Math.min(myPos + SEARCH_RADIUS, boundary);
      const zone = cleanForSearch.substring(searchStart, searchEnd);

      const isHidden = hasHiddenIndicator(zone);
      r.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_VISIBLE;
      r.hidden = isHidden;

      helperLog.info('  ' + r.id.substring(0, 8) + '=' + r.visibility +
        ' (zone ' + searchStart + '-' + searchEnd +
        ', next=' + (nextResume ? nextResume.id.substring(0, 8) : 'none') +
        ', indicators=' + (isHidden ? 'FOUND' : 'none') + ')');
    });

    strategyUsed = true;
  }

  // ═══ NO FINAL FALLBACK: Keep UNKNOWN as UNKNOWN ═══
  // The list page SSR HTML often lacks hidden indicators (client-rendered by React).
  // Defaulting UNKNOWN→VISIBLE here is WRONG — it makes hidden resumes appear visible
  // before the detail page detection has a chance to run.
  // The final fallback UNKNOWN→VISIBLE happens in syncAllResumes() AFTER
  // each resume's detail page has been checked by detectVisibilityFromResumePage().
  const unknownAfterAll = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
  if (unknownAfterAll.length > 0) {
    helperLog.info('List visibility: ' + unknownAfterAll.length + ' resumes still UNKNOWN — will be resolved by detail page detection');
  }

  // ═══ SUMMARY ═══
  const summary = resumes.map(r =>
    r.id.substring(0, 8) + '=' + r.visibility
  ).join(', ');
  helperLog.info('Visibility result: [' + summary + ']');
}

/**
 * Try to extract visibility from Magritte script/hydration state.
 * Looks for JSON patterns in <script> tags that might contain resume
 * visibility data (e.g. BEM blocks, React state, etc.)
 *
 * @param {Document} doc
 * @param {Array} resumes
 * @param {string} html
 * @returns {boolean} true if any resume visibility was determined
 */
function extractVisibilityFromScripts(doc, resumes, html) {
  let found = false;

  // Pattern 1: Look for "hidden":true/false in JSON near resume hash
  // Magritte may serialize state like: {"id":"HASH","hidden":true}
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(script => {
    const text = script.textContent || '';
    if (!text || text.length < 100) return;

    // Check if this script contains any resume hash
    resumes.forEach(r => {
      if (r.visibility !== VISIBILITY_UNKNOWN) return; // already determined

      const hashIdx = text.indexOf(r.id);
      if (hashIdx === -1) return;

      // Look for hidden/visibility near the hash in the script
      const nearby = text.substring(
        Math.max(0, hashIdx - 200),
        Math.min(text.length, hashIdx + 500)
      );

      // Check for JSON patterns indicating hidden status
      if (/"hidden"\s*:\s*true/.test(nearby) ||
          /"visibility"\s*:\s*"hidden"/.test(nearby) ||
          /"status"\s*:\s*"hidden"/.test(nearby) ||
          /"isHidden"\s*:\s*true/.test(nearby)) {
        r.visibility = VISIBILITY_HIDDEN;
        r.hidden = true;
        found = true;
        helperLog.info('  Script visibility: ' + r.id.substring(0, 8) + '=hidden (JSON pattern)');
      }
    });
  });

  // Pattern 2: Look for data-qa="resume-status-hidden" in raw HTML
  // This attribute indicates a hidden resume card
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    // Extract the data-qa value from selector string
    const qaMatch = sel.match(/data-qa="([^"]+)"/) || sel.match(/data-qa\*="([^"]+)"/);
    if (!qaMatch) continue;

    const qaValue = qaMatch[1];
    const qaPattern = 'data-qa="' + qaValue;
    const qaIdx = htmlLower_all(html, qaPattern);

    if (qaIdx.length > 0) {
      helperLog.info('  Found data-qa="' + qaValue + '" at positions: ' + qaIdx.join(', '));

      // For each occurrence, find which resume it belongs to
      qaIdx.forEach(pos => {
        // Look backward for the nearest resume hash
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
          helperLog.info('  data-qa visibility: ' + nearestId.id.substring(0, 8) + '=hidden');
        }
      });
    }
  }

  return found;
}

/**
 * Find all positions of a pattern in a string.
 */
function htmlLower_all(html, pattern) {
  const positions = [];
  const lower = html.toLowerCase();
  let idx = 0;
  while ((idx = lower.indexOf(pattern, idx)) !== -1) {
    positions.push(idx);
    idx += pattern.length;
  }
  return positions;
}
