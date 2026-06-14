/**
 * LIB: RESUME CONSTANTS -- Core utilities.
 * Base constants and utilities shared by title and visibility sub-modules.
 * No dependencies on other resume-constants sub-modules.
 */
import { createLogger } from './anti-hallucination.js';

const coreLog = createLogger('ResumeConst');

/**
 * Minimum length of a hex hash to be considered a valid hh.ru resume ID.
 */
export const MIN_HASH_LEN = 30;

/**
 * Normalize ALL whitespace (including &nbsp; U+00A0, thin spaces, etc.)
 * to regular ASCII spaces. Critical for hh.ru text matching.
 */
export function normalizeWs(text) {
  if (!text) return '';
  return text.replace(/[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, ' ').trim();
}

/**
 * Visibility status values for resumes.
 */
export const VISIBILITY_VISIBLE = 'visible';
export const VISIBILITY_HIDDEN = 'hidden';
export const VISIBILITY_UNKNOWN = 'unknown';

/**
 * Text indicators that a resume is hidden.
 */
export const HIDDEN_INDICATORS = ['многие не видят', 'сделать видимым', 'не видно никому', 'не видно'];

/**
 * Text indicators that a resume is visible.
 */
export const VISIBLE_INDICATORS = ['видно всем', 'видно всем работодателям'];

/**
 * Check if normalized text contains any visible indicator.
 */
export function hasVisibleIndicator(text) {
  if (!text) return false;
  const lower = normalizeWs(text).toLowerCase();
  return VISIBLE_INDICATORS.some(ind => lower.includes(ind));
}

/**
 * Check if normalized text contains any hidden indicator.
 */
export function hasHiddenIndicator(text) {
  if (!text) return false;
  const lower = normalizeWs(text).toLowerCase();
  return HIDDEN_INDICATORS.some(ind => lower.includes(ind));
}

/**
 * Magritte data-qa selectors for resume card containers.
 */
export const RESUME_CARD_SELECTORS = [
  '[data-qa="resume-list-item"]',
  '[data-qa="resume-list-item-wrap"]',
  '[data-qa="resume-list-item-wrapper"]',
  '[data-qa*="resume-list-item"]',
  '[data-qa*="resume-card"]'
];

/**
 * Magritte data-qa selectors for visibility indicator elements.
 */
export const VISIBILITY_HIDDEN_DATA_QA = [
  '[data-qa="resume-status-hidden"]',
  '[data-qa="resume-hidden-message"]',
  '[data-qa="resume-make-visible"]',
  '[data-qa*="resume-hidden"]',
  '[data-qa*="resume-status-hidden"]',
  '[data-qa*="make-visible"]'
];

/**
 * Strip all <script>...</script> blocks from raw HTML.
 */
export function stripScripts(html) {
  if (!html) return '';
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/**
 * Find resume card container for a link element by walking up the DOM.
 */
export function findCardForLink(linkEl) {
  if (!linkEl) return null;

  let el = linkEl;
  for (let i = 0; i < 8; i++) {
    if (!el || el === document.body || el === document.documentElement) break;
    for (const sel of RESUME_CARD_SELECTORS) {
      if (el.matches && el.matches(sel)) return el;
    }
    el = el.parentElement;
  }

  el = linkEl;
  for (let i = 0; i < 8; i++) {
    if (!el || el === document.body || el === document.documentElement) break;
    const parent = el.parentElement;
    if (parent) {
      const textLen = (parent.textContent || '').length;
      if (textLen > 200) return parent;
    }
    el = parent;
  }

  return null;
}
