/**
 * PARSER: VACANCY DETAIL -- Orchestrator
 * ========================================
 * Parses a single vacancy detail page (/vacancy/{id}).
 * Delegates to parseVacancyDetailFromDoc() from vacancy-fetch-text.js
 * for the core parsing logic -- single source of truth.
 *
 * v1.9.30.0: Unified with vacancy-fetch-text.js parser.
 *   - parseVacancyDetailFromDoc() is the canonical parser
 *   - This module adds page-level extras (apply button, diagnostics)
 *
 * v1.9.19.0: split from monolith into focused modules
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { parseVacancyDetailFromDoc } from '../lib/vacancy-fetch-text.js';

const vacLog = createLogger('VacDetail');

/**
 * Parse the current vacancy detail page.
 * Returns a structured vacancy object or null on failure.
 *
 * Uses parseVacancyDetailFromDoc(document, href) as the canonical
 * parser -- same code that runs in background iframe/text fetches.
 */
export function parseVacancyDetail() {
  const t0 = performance.now();
  const url = window.location.href;

  const vacancy = parseVacancyDetailFromDoc(document, url);

  if (!vacancy) {
    vacLog.warn('parseVacancyDetailFromDoc returned null');
    return null;
  }

  // -- Page-level extras that only make sense on the actual page --

  // Apply button detection (uses findElement for visibility check)
  try {
    const applyBtn = document.querySelector(
      '[data-qa="vacancy-response-apply"], [data-qa="vacancy-response-link-top"]'
    );
    vacancy.hasApplyButton = !!applyBtn && document.body.contains(applyBtn);
  } catch (e) {
    vacancy.hasApplyButton = false;
  }

  // Ensure source is set correctly for on-page parsing
  vacancy.source = 'detail';

  const elapsed = (performance.now() - t0).toFixed(1);
  vacLog.info('Parsed vacancy "' + vacancy.title.substring(0, 40) + '" in ' + elapsed + 'ms');
  vacLog.info('Skills: ' + vacancy.keySkills.length + ' (source: ' + vacancy._skillsSource + ')' +
    ' | Derived: ' + vacancy.derivedSkills.length +
    ' | Desc: ' + vacancy.description.text.length + ' chars');

  return vacancy;
}
