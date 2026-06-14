/**
 * LIB: RESUME CONSTANTS -- Barrel re-export.
 * All constants and utilities re-exported from focused sub-modules:
 *   - resume-constants-core.js       -- base constants, normalizeWs, selectors
 *   - resume-constants-title.js      -- UI_NOISE, TITLE_SUFFIX_NOISE, cleanResumeTitle
 *   - resume-constants-visibility.js -- visibility detection functions
 *
 * Existing import paths remain unchanged.
 */

// Core constants and utilities
export {
  MIN_HASH_LEN, normalizeWs,
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  HIDDEN_INDICATORS, VISIBLE_INDICATORS,
  hasVisibleIndicator, hasHiddenIndicator,
  RESUME_CARD_SELECTORS, VISIBILITY_HIDDEN_DATA_QA,
  stripScripts, findCardForLink
} from './resume-constants-core.js';

// Title cleaning utilities
export {
  UI_NOISE, TITLE_SUFFIX_NOISE, LINE_BREAK_INJECTORS,
  cleanResumeTitle
} from './resume-constants-title.js';

// Visibility detection utilities
export {
  detectVisibilityFromLinkText,
  detectVisibilityFromCardText,
  detectVisibilityFromCard
} from './resume-constants-visibility.js';
