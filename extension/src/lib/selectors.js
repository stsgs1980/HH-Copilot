/**
 * LIB: SELECTORS
 * ===============
 * HH.ru DOM selectors for vacancy, resume, auth elements.
 * Uses data-qa attributes (Magritte-compatible) and Bloko BEM classes.
 */

import { HH_SELECTORS } from "./selectors-map.js";

// Re-export for backward compatibility
export { HH_SELECTORS };

// ===============================================
// SELECTOR HELPERS
// ===============================================

export function getSelectors(name) {
  const s = HH_SELECTORS[name];
  return s && Array.isArray(s) ? [...s] : [];
}

export function findElement(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (!el) continue;
      // НЕ проверяем offsetParent (null для fixed/transform элементов)
      if (root === document) {
        if (!document.body.contains(el)) continue;
      } else {
        if (!root.contains(el)) continue;
      }
      const style = window.getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden") return el;
    } catch (_e) {}
  }
  return null;
}

export function findAllElements(name, root) {
  root = root || document;
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els && els.length > 0) return Array.from(els);
    } catch (_e) {}
  }
  return [];
}

// ===============================================
// SELECTOR VALIDATION / DEBUGGING
// ===============================================

/**
 * Test a selector chain against a document and return which selector matched.
 * Useful for debugging when hh.ru changes their DOM structure.
 * @param {string} name - selector name from HH_SELECTORS
 * @param {Document|Element} [root] - root to search in (default: document)
 * @returns {{matched: boolean, selector: string|null, count: number, elements: Element[]}}
 */
export function testSelector(name, root = document) {
  const selectors = getSelectors(name);
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els && els.length > 0) {
        return { matched: true, selector: sel, count: els.length, elements: Array.from(els) };
      }
    } catch (_e) {}
  }
  return { matched: false, selector: null, count: 0, elements: [] };
}

/**
 * Test all selectors and report which ones are failing.
 * Returns a summary object.
 * @param {Document|Element} [root]
 * @returns {Object} { working: string[], failing: string[], details: Object }
 */
export function validateAllSelectors(root = document) {
  const results = { working: [], failing: [], details: {} };
  for (const name of Object.keys(HH_SELECTORS)) {
    const test = testSelector(name, root);
    results.details[name] = test;
    if (test.matched) {
      results.working.push(name);
    } else {
      results.failing.push(name);
    }
  }
  return results;
}

/**
 * Log selector validation results to console.
 * @param {Document|Element} [root]
 */
export function logSelectorValidation(root = document) {
  const results = validateAllSelectors(root);
  console.group("[HH-AR][Selectors] Validation Results");
  console.log(`Working: ${results.working.length} | Failing: ${results.failing.length}`);
  if (results.failing.length > 0) {
    console.warn("Failing selectors:", results.failing);
    for (const name of results.failing) {
      const detail = results.details[name];
      console.warn(
        `  ${name}: tried ${detail.selector ? "last: " + detail.selector : "none"} (${HH_SELECTORS[name].length} in chain)`,
      );
    }
  }
  console.groupEnd();
  return results;
}
