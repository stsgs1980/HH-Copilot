/**
 * Resume visibility diagnostic -- console debugging tool.
 * Split from resume-detail/index.js for anti-monolith compliance.
 */
import {
  MIN_HASH_LEN, HIDDEN_INDICATORS, VISIBILITY_HIDDEN_DATA_QA,
  detectVisibilityFromCard, normalizeWs, stripScripts
} from '../../lib/resume-constants.js';

/**
 * Diagnostic function to analyze the DOM structure for visibility detection.
 * Call from browser console: window.__hhDebugVisibility()
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
  const RESUME_CARD_SELECTORS = [
    '[data-qa="resume-list-item"]',
    '[data-qa="resume-list-item-wrap"]',
    '[data-qa="resume-list-item-wrapper"]',
    '[data-qa*="resume-list-item"]',
    '[data-qa*="resume-card"]'
  ];

  RESUME_CARD_SELECTORS.forEach(sel => {
    const cards = document.querySelectorAll(sel);
    result.strategy1_cards.push({
      selector: sel, count: cards.length,
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

    // Walk up to find card
    let card = null;
    let el = link;
    for (let i = 0; i < 8; i++) {
      if (!el || el === document.body) break;
      for (const sel of RESUME_CARD_SELECTORS) {
        if (el.matches && el.matches(sel)) { card = el; break; }
      }
      if (card) break;
      el = el.parentElement;
    }
    if (!card) {
      el = link;
      for (let i = 0; i < 8; i++) {
        if (!el || el === document.body) break;
        const parent = el.parentElement;
        if (parent && (parent.textContent || '').length > 200) { card = parent; break; }
        el = parent;
      }
    }

    result.strategy2_walks.push({
      id: id.substring(0, 12), href: href.substring(0, 80),
      linkText: (link.textContent || '').substring(0, 60).trim(),
      cardFound: !!card, cardTag: card ? card.tagName : null,
      cardTextPreview: card ? (card.textContent || '').substring(0, 300).trim() : null,
      cardVisibility: card ? detectVisibilityFromCard(card) : null,
      cardOuterHTMLPreview: card ? card.outerHTML.substring(0, 500) : null
    });
  });

  // Check indicators in page HTML
  const pageHtml = document.body.innerHTML || '';
  const pageLower = pageHtml.toLowerCase();
  const normalizedPageText = normalizeWs(pageLower);
  HIDDEN_INDICATORS.forEach(ind => {
    const positions = [];
    let idx = 0;
    while ((idx = normalizedPageText.indexOf(ind, idx)) !== -1) {
      positions.push({ position: idx, context: normalizedPageText.substring(Math.max(0, idx - 50), Math.min(normalizedPageText.length, idx + ind.length + 50)) });
      idx += ind.length;
    }
    result.indicators[ind] = { count: positions.length, occurrences: positions.slice(0, 5) };
  });

  // Check if indicators exist in cleaned HTML
  const cleanHtml = stripScripts(pageHtml);
  const cleanNorm = normalizeWs(cleanHtml.toLowerCase());
  HIDDEN_INDICATORS.forEach(ind => {
    const pos = cleanNorm.indexOf(ind);
    result.rawHtmlSnippets[ind] = {
      foundInClean: pos !== -1, positionInClean: pos,
      contextInClean: pos !== -1 ? cleanNorm.substring(Math.max(0, pos - 80), Math.min(cleanNorm.length, pos + ind.length + 80)) : null
    };
  });

  // Check for data-qa visibility attributes
  result.visibilityDataQa = VISIBILITY_HIDDEN_DATA_QA.map(sel => ({
    selector: sel, count: document.querySelectorAll(sel).length,
    samples: Array.from(document.querySelectorAll(sel)).slice(0, 2).map(el => ({
      tagName: el.tagName, textContent: (el.textContent || '').substring(0, 100).trim(),
      outerHTMLPreview: el.outerHTML.substring(0, 200)
    }))
  }));

  console.log('[HH-Copilot] Visibility diagnostic:', result);
  return result;
}
