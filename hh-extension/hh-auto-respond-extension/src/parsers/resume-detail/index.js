/**
 * BARRIER: resume-detail/index.js
 * ==============================
 * Public API for resume-detail parser module.
 * Re-exports all functions from sub-modules so that
 * existing import paths remain unchanged.
 *
 * MAGRITTE AWARENESS:
 *   - hh.ru uses Magritte (React SSR + hydration)
 *   - data-qa attributes are STABLE selectors; CSS classes are hashed
 *   - Resume hash may appear in <script> (hydration) BEFORE card HTML
 *   - Visibility detection must use data-qa cards or DOM walking, not raw HTML proximity
 */

import { createLogger } from '../../lib/anti-hallucination.js';
import { parseResume } from './parse-resume.js';
import { diagnoseResumeDOM } from './diagnose.js';
import {
  MIN_HASH_LEN, cleanResumeTitle,
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  HIDDEN_INDICATORS, RESUME_CARD_SELECTORS, VISIBILITY_HIDDEN_DATA_QA,
  detectVisibilityFromCard, detectVisibilityFromLinkText, findCardForLink,
  stripScripts, hasHiddenIndicator, normalizeWs
} from '../../lib/resume-constants.js';

const resumeLog = createLogger('Resume');

// ═══════════════════════════════════════════════
// PAGE TYPE DETECTION
// ═══════════════════════════════════════════════

/**
 * Determines the type of the current page based on URL pathname.
 * Used by UI renderers to show contextual hints and CTA buttons.
 *
 * @returns {'resume-detail' | 'resume-list' | 'other'}
 *   - 'resume-detail' — user is on /resume/{hex} (a specific resume view page)
 *   - 'resume-list'   — user is on /applicant/resumes (list of their resumes)
 *   - 'other'         — any other page
 */
export function getResumePageType() {
  const path = window.location.pathname;
  // /resume/{hex} = resume detail view page (was returning 'resume' — BUG: consumers compared to 'resume-detail')
  if (/\/resume\/[a-f0-9]+/.test(path)) return 'resume-detail';
  if (path.includes('/applicant/resumes')) return 'resume-list';
  return 'other';
}

// ═══════════════════════════════════════════════
// EXPAND HIDDEN SECTIONS
// ═══════════════════════════════════════════════

/**
 * Clicks "Развернуть" / "Показать все" buttons on the resume page to reveal
 * hidden experience entries, then waits for React hydration to complete.
 *
 * Side effects:
 *   - Clicks DOM buttons (triggers React state changes)
 *   - Waits 1500ms after each click for content to load
 *
 * @returns {Promise<void>}
 */
export async function expandHiddenSections() {
  const expandButtons = document.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
  const clicked = [];
  expandButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('посмотреть всё') || text.includes('показать все') || text.includes('показать ещё') ||
        text.includes('посмотреть все') || text.includes('развернуть') || text.includes('expand')) {
      try {
        btn.click();
        clicked.push(text);
      } catch (e) {}
    }
  });
  if (clicked.length > 0) {
    resumeLog.info('Expanded hidden sections: ' + clicked.join(', '));
    // Ждём подгрузки контента
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ═══════════════════════════════════════════════
// PARSE RESUME LIST (Magritte-aware)
// ═══════════════════════════════════════════════

/**
 * Parse resume list from the live DOM on /applicant/resumes.
 *
 * Uses multiple strategies for visibility detection:
 *
 * Strategy 1: data-qa card containers
 *   - Find [data-qa="resume-list-item"] etc. elements
 *   - Each card contains a resume link + status info
 *   - Check card text for hidden indicators
 *
 * Strategy 2: DOM walking from link
 *   - For each resume link, walk up DOM to find card container
 *   - Check container text for hidden indicators
 *
 * Strategy 3: Proximity search on innerHTML (with script stripping)
 *   - Strip <script> tags from innerHTML first
 *   - Find hash positions and search nearby for indicators
 *   - Fallback for when card containers can't be found
 */
export function parseResumeList() {
  const resumes = [];

  // ═══ STRATEGY 0: Link text detection (MOST RELIABLE for Magritte) ═══
  // In Magritte, hidden resumes have "Многие не видят ваше резюме"
  // directly inside the link's textContent. No DOM walking needed.
  const links = document.querySelectorAll('a[href]');
  const seen = new Set();

  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
    if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
    if (!hashMatch) return;

    const id = hashMatch[1];
    if (id.length < MIN_HASH_LEN) return;
    if (seen.has(id)) return;
    seen.add(id);

    const rawLinkText = link.textContent || '';
    const title = cleanResumeTitle(rawLinkText, 'Без названия');
    const vis = detectVisibilityFromLinkText(rawLinkText);

    resumes.push({
      id: id,
      title: title,
      url: href.startsWith('http') ? href : 'https://hh.ru' + href,
      visibility: vis.visibility,
      hidden: vis.hidden
    });

    resumeLog.info('  Link: ' + id.substring(0, 8) + '="' + title.substring(0, 30) + '"=' +
      vis.visibility + ' (method=' + vis.method + ')');
  });

  // If link-text detected all resumes (hidden or visible), we're done
  const allDetected = resumes.every(r => r.visibility === VISIBILITY_HIDDEN || r.visibility === VISIBILITY_VISIBLE);
  if (allDetected && resumes.length > 0) {
    resumeLog.info('Strategy 0: all ' + resumes.length + ' resumes detected from link text');
  } else {
    // Some resumes are UNKNOWN — try other strategies for those
    const unknownResumes = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    resumeLog.info('Strategy 0: ' + (resumes.length - unknownResumes.length) + ' detected, ' +
      unknownResumes.length + ' unknown — trying data-qa cards');

    // ═══ STRATEGY 1: data-qa card containers ═══
    let filled = 0;
    for (const sel of RESUME_CARD_SELECTORS) {
      const cards = document.querySelectorAll(sel);
      if (cards.length === 0) continue;

      resumeLog.info('Strategy 1: Found ' + cards.length + ' cards with selector: ' + sel);

      cards.forEach(card => {
        const cardLink = card.querySelector('a[href*="/resume/"], a[href*="resume="]');
        if (!cardLink) return;

        const cardHref = cardLink.getAttribute('href') || '';
        let cardHashMatch = cardHref.match(/\/resume\/([a-f0-9]+)/);
        if (!cardHashMatch) cardHashMatch = cardHref.match(/[?&]resume=([a-f0-9]+)/);
        if (!cardHashMatch) return;

        const cardId = cardHashMatch[1];
        const resume = resumes.find(r => r.id === cardId);
        if (!resume || resume.visibility !== VISIBILITY_UNKNOWN) return;

        const result = detectVisibilityFromCard(card);
        resume.visibility = result.visibility;
        resume.hidden = result.hidden;
        filled++;

        resumeLog.info('  Card: ' + cardId.substring(0, 8) + '=' + result.visibility + ' (method=' + result.method + ')');
      });

      if (filled > 0) break;
    }

    // ═══ STRATEGY 2: DOM walking for remaining unknowns ═══
    const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (stillUnknown.length > 0) {
      resumeLog.info('Strategy 2: DOM walking for ' + stillUnknown.length + ' unknown resumes');
      stillUnknown.forEach(resume => {
        // Find the link for this resume
        const link = document.querySelector('a[href*="' + resume.id + '"]');
        if (!link) return;

        const card = findCardForLink(link);
        if (card) {
          const result = detectVisibilityFromCard(card);
          resume.visibility = result.visibility;
          resume.hidden = result.hidden;
          resumeLog.info('  Walk: ' + resume.id.substring(0, 8) + '=' + result.visibility + ' (method=' + result.method + ')');
        }
      });
    }

    // ═══ STRATEGY 3: Proximity search for remaining unknowns ═══
    const finalUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
    if (finalUnknown.length > 0) {
      resumeLog.info('Strategy 3: proximity search for ' + finalUnknown.length + ' remaining unknowns');
      const pageHtml = stripScripts(document.body.innerHTML || '');
      const pageLower = pageHtml.toLowerCase();

      finalUnknown.forEach(resume => {
        const hashPos = pageLower.indexOf(resume.id.toLowerCase());
        if (hashPos === -1) return;

        let searchEnd = hashPos + 5000;
        resumes.forEach(other => {
          if (other.id === resume.id) return;
          const otherPos = pageLower.indexOf(other.id.toLowerCase());
          if (otherPos > hashPos && otherPos < searchEnd) searchEnd = otherPos;
        });

        const zone = pageLower.substring(Math.max(0, hashPos - 500), searchEnd);
        // CRITICAL: use hasHiddenIndicator() which normalizes &nbsp; (U+00A0)
        const isHidden = hasHiddenIndicator(zone);
        resume.visibility = isHidden ? VISIBILITY_HIDDEN : VISIBILITY_VISIBLE;
        resume.hidden = isHidden;
        resumeLog.info('  Proximity: ' + resume.id.substring(0, 8) + '=' + resume.visibility);
      });
    }
  }

  // ═══ NO EARLY FALLBACK: Keep UNKNOWN as UNKNOWN ═══
  // Defaulting UNKNOWN→VISIBLE here is premature — the detail page detection
  // in fetchAndParseResume() hasn't run yet. The final UNKNOWN→VISIBLE fallback
  // is in syncAllResumes() after ALL detection has completed.
  const stillUnknown = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN);
  if (stillUnknown.length > 0) {
    resumeLog.info('List visibility: ' + stillUnknown.length + ' resumes still UNKNOWN — will be resolved by detail page detection');
  }

  // ═══ SUMMARY ═══
  const hiddenCount = resumes.filter(r => r.visibility === VISIBILITY_HIDDEN).length;
  const visibleCount = resumes.filter(r => r.visibility === VISIBILITY_VISIBLE).length;
  const unknownCount = resumes.filter(r => r.visibility === VISIBILITY_UNKNOWN).length;
  resumeLog.info('Resume list: ' + resumes.length + ' total (' +
    hiddenCount + ' hidden, ' + visibleCount + ' visible, ' + unknownCount + ' unknown)');

  return resumes;
}

// ═══════════════════════════════════════════════
// VISIBILITY DIAGNOSTIC (for console debugging)
// ═══════════════════════════════════════════════

/**
 * Diagnostic function to analyze the DOM structure for visibility detection.
 * Call from browser console: window.__hhDebugVisibility()
 * Returns detailed info about what selectors/cards/indicators are found.
 */
export function debugVisibility() {
  const result = {
    url: window.location.href,
    strategy1_cards: [],
    strategy2_walks: [],
    strategy3_proximity: null,
    indicators: {},
    rawHtmlSnippets: {}
  };

  // Check data-qa card selectors
  RESUME_CARD_SELECTORS.forEach(sel => {
    const cards = document.querySelectorAll(sel);
    result.strategy1_cards.push({
      selector: sel,
      count: cards.length,
      samples: Array.from(cards).slice(0, 3).map(card => ({
        tagName: card.tagName,
        textLength: (card.textContent || '').length,
        textPreview: (card.textContent || '').substring(0, 200).trim(),
        hasHiddenDataQa: VISIBILITY_HIDDEN_DATA_QA.some(qa => card.querySelector(qa) !== null),
        linksInside: card.querySelectorAll('a[href*="resume"], a[href*="/resume/"]').length,
        outerHTMLPreview: card.outerHTML.substring(0, 300)
      }))
    });
  });

  // Check DOM walking for each resume link
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    let hashMatch = href.match(/\/resume\/([a-f0-9]+)/);
    if (!hashMatch) hashMatch = href.match(/[?&]resume=([a-f0-9]+)/);
    if (!hashMatch) return;
    const id = hashMatch[1];
    if (id.length < MIN_HASH_LEN) return;

    const card = findCardForLink(link);
    result.strategy2_walks.push({
      id: id.substring(0, 12),
      href: href.substring(0, 80),
      linkText: (link.textContent || '').substring(0, 60).trim(),
      cardFound: !!card,
      cardTag: card ? card.tagName : null,
      cardTextPreview: card ? (card.textContent || '').substring(0, 300).trim() : null,
      cardVisibility: card ? detectVisibilityFromCard(card) : null,
      cardOuterHTMLPreview: card ? card.outerHTML.substring(0, 500) : null
    });
  });

  // Check indicators in page HTML
  const pageHtml = document.body.innerHTML || '';
  const pageLower = pageHtml.toLowerCase();
  // CRITICAL: normalize whitespace before searching for indicators
  // hh.ru uses &nbsp; (U+00A0) which won't match regular-space indicators
  const normalizedPageText = normalizeWs(pageLower);
  HIDDEN_INDICATORS.forEach(ind => {
    const positions = [];
    let idx = 0;
    while ((idx = normalizedPageText.indexOf(ind, idx)) !== -1) {
      positions.push({
        position: idx,
        context: normalizedPageText.substring(Math.max(0, idx - 50), Math.min(normalizedPageText.length, idx + ind.length + 50))
      });
      idx += ind.length;
    }
    result.indicators[ind] = {
      count: positions.length,
      occurrences: positions.slice(0, 5)
    };
  });

  // Check if indicators exist in cleaned HTML (no scripts)
  const cleanHtml = stripScripts(pageHtml);
  const cleanNorm = normalizeWs(cleanHtml.toLowerCase());
  HIDDEN_INDICATORS.forEach(ind => {
    const pos = cleanNorm.indexOf(ind);
    result.rawHtmlSnippets[ind] = {
      foundInClean: pos !== -1,
      positionInClean: pos,
      contextInClean: pos !== -1
        ? cleanNorm.substring(Math.max(0, pos - 80), Math.min(cleanNorm.length, pos + ind.length + 80))
        : null
    };
  });

  // Check for data-qa visibility attributes on the page
  result.visibilityDataQa = VISIBILITY_HIDDEN_DATA_QA.map(sel => ({
    selector: sel,
    count: document.querySelectorAll(sel).length,
    samples: Array.from(document.querySelectorAll(sel)).slice(0, 2).map(el => ({
      tagName: el.tagName,
      textContent: (el.textContent || '').substring(0, 100).trim(),
      outerHTMLPreview: el.outerHTML.substring(0, 200)
    }))
  }));

  console.log('[HH-Copilot] Visibility diagnostic:', result);
  return result;
}

// ═══════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════

export { parseResume, diagnoseResumeDOM };
