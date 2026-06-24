/**
 * VACANCY FETCH TEXT -- helpers (company name cleanup, experience parse).
 * Split from vacancy-fetch-text.js for Rule 12 (anti-monolith, 250-line cap).
 *
 * v1.9.61.0
 */

import { parseExperienceString } from './parse-experience.js';

/**
 * Parse experience element from document into vacancy.experience.
 *
 * @param {Document} doc
 * @param {Object} vacancy -- mutated in-place
 */
export function parseExperienceFromDoc(doc, vacancy) {
  const expEl = doc.querySelector(
    '[data-qa="vacancy-experience"], [data-qa*="work-experience"], [data-qa*="experience"]'
  );
  if (!expEl) return;
  const raw = (expEl.textContent || '').trim();
  vacancy.experience = parseExperienceString(raw);
}

/**
 * Extract a clean company name from a [data-qa="vacancy-company-name"] element.
 *
 * hh.ru wraps the company name in a span, but the span's parent or the span
 * itself may contain sibling/nested noise:
 *   - Review count badge: "4,935 отзывов" or "234 отзыва"
 *   - Inline <script> with window.globalServiceVars = {...}
 *   - Inline <style> blocks
 *   - Star rating SVGs
 *
 * Strategy:
 *   1. Clone the element (so we don't mutate the page DOM).
 *   2. Remove all <script>, <style>, <svg>, [data-qa*="reviews"]> children.
 *   3. Read textContent of the cleaned clone.
 *   4. Cut the result at the first "N отзывов" / "N reviews" phrase that slipped in.
 *   5. Trim trailing separators (em dash, pipe, bullet, middle dot).
 *
 * @param {Element} el -- the [data-qa="vacancy-company-name"] element
 * @returns {string} -- clean company name, '' if nothing extractable
 */
export function extractCleanCompanyName(el) {
  if (!el) return '';
  try {
    const clone = el.cloneNode(true);
    // Remove noise children from the CLONE only (page DOM untouched)
    clone.querySelectorAll('script, style, svg, [data-qa*="reviews"], [data-qa*="rating"]')
      .forEach(n => n.remove());
    let text = (clone.textContent || '').trim();
    if (!text) {
      // Fallback: maybe the element itself is a link with just the name
      text = (el.textContent || '').trim();
    }
    // Cut at "N отзывов" / "N reviews" / "N отзыва" patterns
    // Examples: "ООО САНЛАЙФ4,935 отзывов" -> "ООО САНЛАЙФ"
    //           "Сбер 1234 отзыва"         -> "Сбер"
    text = text.replace(/\s*\d[\d\s.,]*\s*(отзыв\w*|review\w*)\s*.*/i, '').trim();
    // Also cut at " window." start (script leaked through somehow)
    text = text.replace(/\s+window\..*$/s, '').trim();
    // Trim trailing separators (em dash U+2014, hyphen, pipe, bullet, middle dot)
    text = text.replace(/[\s\u2014\-|\u2022\u00B7]+$/, '').trim();
    return text;
  } catch (_e) {
    return (el.textContent || '').trim();
  }
}
