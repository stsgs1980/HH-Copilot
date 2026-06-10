/**
 * LIB: RESUME CONSTANTS
 * ========================
 * Shared constants for resume title cleaning and visibility detection.
 * Used by both fetch-based (resume-fetch-helpers) and DOM-based (resume-detail)
 * parsers to ensure consistent behaviour.
 *
 * MAGRITTE NOTES:
 *   - hh.ru uses Magritte design system (React-based SSR + hydration)
 *   - CSS classes have hashes and change between deploys — NEVER rely on them
 *   - data-qa attributes are STABLE and should be used for all selectors
 *   - Resume hash may appear in <script> tags (React hydration state) BEFORE
 *     the actual card HTML — proximity search must strip scripts first
 *   - Visibility indicators may be client-rendered (not in fetch HTML)
 *   - Magritte concatenates link child text WITHOUT newlines:
 *     "Постоянная работаКоммерческий директор (CCO)Многие не видят ваше резюме"
 *     all on one line — cleanResumeTitle must handle this
 *   - CRITICAL: hh.ru uses &nbsp; (U+00A0 non-breaking space) in Russian text!
 *     "Многие\u00A0не\u00A0видят" will NOT match "многие не видят" with regular spaces.
 *     ALL text comparison MUST normalize whitespace first via normalizeWs().
 */

/**
 * Minimum length of a hex hash to be considered a valid hh.ru resume ID.
 * Real IDs are 40+ hex chars; shorter ones are UI artefacts.
 */
export const MIN_HASH_LEN = 30;

/**
 * Normalize ALL whitespace (including &nbsp; U+00A0, thin spaces, etc.)
 * to regular ASCII spaces. Critical for hh.ru text matching.
 *
 * @param {string} text - Any text from hh.ru DOM or HTML
 * @returns {string} Text with all whitespace normalized to regular spaces
 */
export function normalizeWs(text) {
  if (!text) return '';
  // Replace ALL Unicode whitespace chars (including \u00A0 &nbsp;) with regular space
  // Then collapse multiple spaces into one
  return text.replace(/[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, ' ').trim();
}

/**
 * Regex for UI text that appears inside resume links but is NOT a title.
 * Tested against individual lines split from link.textContent.
 * NOTE: applied AFTER whitespace normalization
 */
export const UI_NOISE = /^(сделать видимым|скрыть|обновить|поднять|продлить|дублировать|удалить|перейти к вакансиям|перейти|постоянная работа|многие не видят|копировать|редактировать|частичная занятость|проектная работа|стажировка|волонтёрство)/i;

/**
 * Regex for employment-type noise that hh.ru appends to resume titles.
 * Applied after the initial line-by-line filter to catch leftover suffixes.
 */
export const TITLE_SUFFIX_NOISE = /\s*(Постоянная работа|Частичная занятость|Проектная работа|Стажировка|Волонтёрство)\s*$/i;

/**
 * Visibility status values for resumes.
 *   'visible'  — resume is publicly visible to employers
 *   'hidden'   — resume is hidden ("Многие не видят" / "Сделать видимым")
 *   'unknown'  — status could not be determined
 */
export const VISIBILITY_VISIBLE = 'visible';
export const VISIBILITY_HIDDEN = 'hidden';
export const VISIBILITY_UNKNOWN = 'unknown';

/**
 * Text indicators that a resume is hidden.
 * If ANY of these appear in the link/card text (after whitespace normalization),
 * the resume is hidden.
 * These are the actual Russian phrases hh.ru shows on hidden resumes.
 * ALL use regular spaces — normalizeWs() must be called before matching.
 */
export const HIDDEN_INDICATORS = ['многие не видят', 'сделать видимым'];

/**
 * Check if normalized text contains any hidden indicator.
 * Applies whitespace normalization FIRST to handle &nbsp; from hh.ru.
 *
 * @param {string} text - Raw text (link textContent, card textContent, etc.)
 * @returns {boolean} true if hidden indicator found
 */
export function hasHiddenIndicator(text) {
  if (!text) return false;
  const lower = normalizeWs(text).toLowerCase();
  return HIDDEN_INDICATORS.some(ind => lower.includes(ind));
}

/**
 * Patterns that Magritte concatenates into a single line with the title.
 * We inject newlines before these so they become separate "lines"
 * that the line-by-line UI_NOISE filter can catch.
 * Order matters: longer patterns first to avoid partial matches.
 * NOTE: These use \s+ between words to handle &nbsp; variations.
 */
const LINE_BREAK_INJECTORS = [
  /Многие\s+не\s+видят[^\n]*/gi,
  /Сделать\s+видимым/gi,
  /Постоянная\s+работа/gi,
  /Частичная\s+занятость/gi,
  /Проектная\s+работа/gi,
  /Стажировка/gi,
  /Волонтёрство/gi,
  /Перейти\s+к\s+вакансиям/gi,
];

/**
 * Clean a raw title string from hh.ru DOM.
 *
 * Magritte concatenates all child text into one line without newlines:
 *   "Постоянная работаКоммерческий директор (CCO)Многие не видят ваше резюме"
 *
 * Step 1: Normalize whitespace (&nbsp; → regular space)
 * Step 2: Inject newlines before known noise patterns so they become
 *         separate lines that the line filter can handle.
 * Step 3: Split into lines, pick first non-noise line.
 * Step 4: Strip trailing employment-type suffixes.
 * Step 5: Return fallback if nothing remains.
 *
 * @param {string} rawText - The raw link.textContent
 * @param {string} [fallback='Untitled'] - Fallback when no clean title found
 * @returns {string} Clean title
 */
export function cleanResumeTitle(rawText, fallback) {
  fallback = fallback || 'Untitled';
  if (!rawText) return fallback;

  // Step 1: Normalize whitespace (&nbsp; → regular space)
  let text = normalizeWs(rawText);

  // Step 2: Inject newlines before noise patterns (Magritte single-line fix)
  for (const pattern of LINE_BREAK_INJECTORS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, '\n$&');
  }

  // Step 3: Split into lines and filter
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);
  let title = lines.find(l => !UI_NOISE.test(l)) || lines[0] || '';

  // Step 4: Strip trailing employment-type suffixes
  title = title.replace(TITLE_SUFFIX_NOISE, '').trim();

  return title || fallback;
}

/**
 * Detect resume visibility from the link's raw textContent.
 * This is the MOST RELIABLE method because in Magritte the link text
 * directly includes "Многие не видят ваше резюме" for hidden resumes.
 *
 * CRITICAL: Uses hasHiddenIndicator() which normalizes &nbsp; first.
 *
 * @param {string} linkText - The raw link.textContent
 * @returns {{ visibility: string, hidden: boolean, method: string }}
 */
export function detectVisibilityFromLinkText(linkText) {
  if (!linkText) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'no-link-text' };

  const isHidden = hasHiddenIndicator(linkText);
  if (isHidden) {
    return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'link-text' };
  }
  // If link text is clean (no hidden markers), the resume is visible
  return { visibility: VISIBILITY_VISIBLE, hidden: false, method: 'link-text-clean' };
}

/**
 * Detect resume visibility from the text content of its card container.
 * @param {string} cardText - Text content of the resume's DOM card
 * @returns {string} One of VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN
 */
export function detectVisibilityFromCardText(cardText) {
  if (!cardText) return VISIBILITY_UNKNOWN;
  const isHidden = hasHiddenIndicator(cardText);
  return isHidden ? VISIBILITY_HIDDEN : VISIBILITY_VISIBLE;
}

/**
 * Detect resume visibility from a DOM element (card container).
 * Checks both data-qa attributes (Magritte-specific) and text content.
 *
 * @param {Element} cardEl - The DOM element representing the resume card
 * @returns {{ visibility: string, hidden: boolean, method: string }}
 */
export function detectVisibilityFromCard(cardEl) {
  if (!cardEl) return { visibility: VISIBILITY_UNKNOWN, hidden: false, method: 'no-card' };

  // Strategy A: Check for hidden-specific data-qa attributes inside the card
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const found = cardEl.querySelector(sel);
    if (found) {
      return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'data-qa:' + sel };
    }
  }

  // Strategy B: Check card text content for hidden indicators (with &nbsp; normalization)
  if (hasHiddenIndicator(cardEl.textContent || '')) {
    return { visibility: VISIBILITY_HIDDEN, hidden: true, method: 'text-indicator' };
  }

  // If we have a card but no hidden indicators, it's visible
  return { visibility: VISIBILITY_VISIBLE, hidden: false, method: 'card-no-indicators' };
}

/**
 * Magritte data-qa selectors for resume card containers.
 * Tried in order — first match wins.
 * Add new selectors here when hh.ru updates their markup.
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
 * If found inside a card, the resume is hidden.
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
 * Critical for Magritte: the resume hash appears in React hydration <script>
 * BEFORE the actual card HTML, causing proximity search to look at the wrong zone.
 *
 * @param {string} html - Raw HTML string
 * @returns {string} HTML with all script blocks removed
 */
export function stripScripts(html) {
  if (!html) return '';
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/**
 * Find resume card container for a link element by walking up the DOM.
 * Tries data-qa selectors first, then walks up to 8 levels looking for
 * a container with enough text to be a full resume card.
 *
 * @param {Element} linkEl - The <a> element linking to the resume
 * @returns {Element|null} The card container element, or null
 */
export function findCardForLink(linkEl) {
  if (!linkEl) return null;

  // Walk up looking for a data-qa card container
  let el = linkEl;
  for (let i = 0; i < 8; i++) {
    if (!el || el === document.body || el === document.documentElement) break;
    for (const sel of RESUME_CARD_SELECTORS) {
      if (el.matches && el.matches(sel)) {
        return el;
      }
    }
    el = el.parentElement;
  }

  // Walk up looking for a container with substantial text (card-sized)
  el = linkEl;
  for (let i = 0; i < 8; i++) {
    if (!el || el === document.body || el === document.documentElement) break;
    const parent = el.parentElement;
    if (parent) {
      const textLen = (parent.textContent || '').length;
      if (textLen > 200) {
        return parent;
      }
    }
    el = parent;
  }

  return null;
}
