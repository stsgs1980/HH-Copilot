/**
 * Iframe visibility detection -- DOM-based strategies.
 * Extracted from resume-fetch-iframe-vis.js for anti-monolith compliance.
 *
 * Strategies: S0 (visibility-card), S1 (data-qa), S2 (key buttons), S4 (hide-link).
 */
import {
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, normalizeWs, VISIBILITY_HIDDEN_DATA_QA
} from './resume-constants.js';

/**
 * Strategy S0: Check resume-visibility-card (PRIMARY for Magritte).
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkVisibilityCard(iframeDoc) {
  const visCard = iframeDoc.querySelector('[data-qa="resume-visibility-card"]');
  if (visCard) {
    const cardText = normalizeWs(visCard.textContent || '').toLowerCase();
    if (cardText.includes('не видно никому') || cardText.includes('не\u00A0видно никому')) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S0:visibility-card="не видно никому" -> HIDDEN' };
    }
    if (cardText.includes('видно всем') || cardText.includes('видно\u00A0всем')) {
      return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S0:visibility-card="видно всем" -> VISIBLE' };
    }
    return { visibility: null, trace: 'iframe-S0:visibility-card-unknown-text="' + cardText.substring(0, 60) + '"' };
  }
  return { visibility: null, trace: 'iframe-S0:no-visibility-card' };
}

/**
 * Strategy S1: Check for hidden-specific data-qa attributes.
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkHiddenDataQa(iframeDoc) {
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const found = iframeDoc.querySelector(sel);
    if (found) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S1:data-qa=' + sel + ' -> HIDDEN' };
    }
  }
  return { visibility: null, trace: 'iframe-S1:no-data-qa-hidden' };
}

/**
 * Strategy S2: Check for "Сделать видимым" / "Скрыть резюме" buttons.
 * @param {NodeListOf<Element>} allButtons - Pre-collected buttons/links
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkKeyButtons(allButtons) {
  for (const btn of allButtons) {
    const text = normalizeWs((btn.textContent || '')).toLowerCase();
    const qa = (btn.getAttribute('data-qa') || '').toLowerCase();
    if (text.includes('сделать видимым') || qa.includes('make-visible') || qa.includes('show-resume')) {
      return { visibility: VISIBILITY_HIDDEN, trace: 'iframe-S2:btn="сделать видимым" -> HIDDEN' };
    }
    if (text.includes('скрыть резюме') || qa.includes('hide-resume') || qa.includes('resume-action-hide')) {
      return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S2:btn="скрыть резюме" -> VISIBLE' };
    }
  }
  return { visibility: null, trace: 'iframe-S2:no-key-buttons' };
}

/**
 * Strategy S4: Check for "Скрыть" action link (means resume IS visible).
 * @returns {{ visibility: string|null, trace: string }}
 */
export function checkHideLink(iframeDoc) {
  const hideLink = iframeDoc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
  if (hideLink) {
    return { visibility: VISIBILITY_VISIBLE, trace: 'iframe-S4:hide-link-found -> VISIBLE' };
  }
  return { visibility: null, trace: 'iframe-S4:no-hide-link' };
}

/**
 * Collect ALL buttons/links with visibility-related text for diagnostics.
 * @param {Document} iframeDoc
 * @returns {{ buttons: Array, diagInfo: object }}
 */
export function collectDiagButtons(iframeDoc) {
  const buttons = [];
  const allButtons = iframeDoc.querySelectorAll('button, a, [role="button"]');
  for (const btn of allButtons) {
    const text = normalizeWs((btn.textContent || '')).toLowerCase();
    const qa = (btn.getAttribute('data-qa') || '').toLowerCase();
    const href = (btn.getAttribute('href') || '').toLowerCase();
    if (text.includes('видим') || text.includes('скрыть') || text.includes('скрыт') ||
        qa.includes('visible') || qa.includes('hide') || qa.includes('hidden') ||
        qa.includes('show') || href.includes('visible') || href.includes('hide')) {
      buttons.push({ text: text.substring(0, 50), qa, href: href.substring(0, 60), tag: btn.tagName });
    }
  }
  return { buttons, allButtons };
}
