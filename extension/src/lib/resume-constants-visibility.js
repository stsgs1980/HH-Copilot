/**
 * LIB: RESUME CONSTANTS -- Visibility detection utilities.
 * Constants and functions for detecting whether a resume is visible or hidden.
 */
import {
    VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
    VISIBILITY_HIDDEN_DATA_QA,
  hasHiddenIndicator, hasVisibleIndicator
} from './resume-constants-core.js';

export { VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN };

/**
 * Detect resume visibility from the link's raw textContent.
 */
export function detectVisibilityFromLinkText(linkText) {
  if (!linkText) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'no-link-text' };
  const isHidden = hasHiddenIndicator(linkText);
  if (isHidden) return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'link-text' };
  return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'link-text-no-indicator' };
}

/**
 * Detect resume visibility from the text content of its card container.
 */
export function detectVisibilityFromCardText(cardText) {
  if (!cardText) return VISIBILITY_UNKNOWN;
  if (hasHiddenIndicator(cardText)) return VISIBILITY_HIDDEN;
  if (hasVisibleIndicator(cardText)) return VISIBILITY_VISIBLE;
  return VISIBILITY_UNKNOWN;
}

/**
 * Detect resume visibility from a DOM element (card container).
 */
export function detectVisibilityFromCard(cardEl) {
  if (!cardEl) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'no-card' };

  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const found = cardEl.querySelector(sel);
    if (found) return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'data-qa:' + sel };
  }

  if (hasHiddenIndicator(cardEl.textContent || '')) {
    return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'text-indicator' };
  }
  if (hasVisibleIndicator(cardEl.textContent || '')) {
    return { visibility: VISIBILITY_VISIBLE, hidden: false, method: 'text-visible-indicator' };
  }

  return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'card-no-indicators' };
}
