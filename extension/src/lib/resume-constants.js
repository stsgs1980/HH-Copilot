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
  HIDDEN_INDICATORS,
  MIN_HASH_LEN,
  RESUME_CARD_SELECTORS,
  VISIBILITY_HIDDEN,
  VISIBILITY_HIDDEN_DATA_QA,
  VISIBILITY_UNKNOWN,
  VISIBILITY_VISIBLE,
  VISIBLE_INDICATORS,
  findCardForLink,
  hasHiddenIndicator,
  hasVisibleIndicator,
  normalizeWs,
  stripScripts,
} from "./resume-constants-core.js";

// Title cleaning utilities
export { LINE_BREAK_INJECTORS, TITLE_SUFFIX_NOISE, UI_NOISE, cleanResumeTitle } from "./resume-constants-title.js";

// Visibility detection utilities
export {
  detectVisibilityFromCard,
  detectVisibilityFromCardText,
  detectVisibilityFromLinkText,
} from "./resume-constants-visibility.js";
