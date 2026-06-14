/**
 * DIAGNOSE: Structure Scanner
 * ============================
 * Checks HH_SELECTORS match, logs headings, and page sections.
 */

import { HH_SELECTORS } from '../../lib/selectors.js';

/**
 * Check which resume selectors from HH_SELECTORS match on this page.
 */
export function checkSelectors() {
  console.group('%c[HH-AR][DIAG] Selector check (resume selectors):', 'color:#2964FF');
  const resumeSelectorKeys = Object.keys(HH_SELECTORS).filter(k => k.startsWith('resume'));
  resumeSelectorKeys.forEach(key => {
    const sels = HH_SELECTORS[key];
    let found = false;
    for (const sel of sels) {
      try {
        const el = document.querySelector(sel);
        if (el && document.body.contains(el)) {
          console.log('%c  + ' + key + ' -> ' + sel, 'color:#22c55e', 'text:', (el.textContent || '').trim().substring(0, 60));
          found = true;
          break;
        }
      } catch (e) {}
    }
    if (!found) {
      console.log('%c  x ' + key + ' -> none matched', 'color:#ef4444', 'tried:', sels);
    }
  });
  console.groupEnd();
}

/**
 * Log all h1-h3 headings on the page.
 */
export function scanHeadings() {
  console.group('%c[HH-AR][DIAG] Headings (h1-h3):', 'color:#2964FF');
  document.querySelectorAll('h1, h2, h3').forEach(h => {
    console.log('  ' + h.tagName + ':', (h.textContent || '').trim().substring(0, 100), '| data-qa:', h.getAttribute('data-qa') || '(none)');
  });
  console.groupEnd();
}

/**
 * Log page sections (section, [data-qa*="block"], .bloko-column).
 */
export function scanSections() {
  console.group('%c[HH-AR][DIAG] Page sections (section, [data-qa*="block"]):', 'color:#2964FF');
  const sections = document.querySelectorAll('section, [data-qa*="block"], .bloko-column');
  sections.forEach((s, i) => {
    const qa = s.getAttribute('data-qa') || '(none)';
    const heading = s.querySelector('h2, h3, [data-qa*="title"]');
    const headingText = heading ? (heading.textContent || '').trim().substring(0, 80) : '(no heading)';
    console.log('  Section #' + i + ':', qa, '| heading:', headingText);
  });
  console.groupEnd();
}
