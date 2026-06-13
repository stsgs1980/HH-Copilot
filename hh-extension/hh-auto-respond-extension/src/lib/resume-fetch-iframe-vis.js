/**
 * Iframe visibility detection.
 * Detects visibility from the fully-hydrated iframe DOM — the MOST RELIABLE method
 * because hh.ru renders visibility indicators client-side via React, not in SSR HTML.
 *
 * Split from resume-fetch-strategy6-iframe.js for anti-monolith compliance.
 * Strategies extracted to:
 *   - resume-fetch-iframe-vis-dom.js  (DOM-based: S0, S1, S2, S4)
 *   - resume-fetch-iframe-vis-adv.js  (text/script: S3, S5, S6, S7, S8)
 */
import { createLogger } from './anti-hallucination.js';
import { VISIBILITY_UNKNOWN, normalizeWs } from './resume-constants.js';
import {
  checkVisibilityCard, checkHiddenDataQa, checkKeyButtons, checkHideLink,
  collectDiagButtons
} from './resume-fetch-iframe-vis-dom.js';
import {
  checkBodyIndicators, checkBodyVisibilityText, checkScriptPatterns,
  checkNotificationBanners, checkActionLinks, collectVisRelatedElements
} from './resume-fetch-iframe-vis-adv.js';

const visLog = createLogger('ResumeFetch');

/**
 * Run a strategy check; if it returns a definitive result, push trace and return.
 * @returns {boolean} true if strategy determined visibility
 */
function tryStrategy(result, trace) {
  if (result.trace) trace.push(result.trace);
  return result.visibility !== null;
}

/**
 * Detect visibility from the fully-hydrated iframe DOM.
 * Enhanced with multiple detection strategies and diagnostic logging.
 *
 * @param {Document} iframeDoc - The iframe's contentDocument (after hydration)
 * @returns {{ visibility: string, trace: string[] }}
 */
export function detectVisibilityFromIframeDoc(iframeDoc) {
  const trace = [];

  // Collect diagnostic buttons + reuse allButtons for strategy S2
  const { buttons: diagButtons, allButtons } = collectDiagButtons(iframeDoc);
  visLog.info('[VIS-IFRAME] Diagnostic buttons: ' + JSON.stringify(diagButtons));

  // S0: visibility-card (PRIMARY)
  let r = checkVisibilityCard(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S1: data-qa hidden attributes
  r = checkHiddenDataQa(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S2: key buttons ("Сделать видимым" / "Скрыть резюме")
  r = checkKeyButtons(allButtons);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S3: body text hidden/visible indicators
  const bodyText = iframeDoc.body ? normalizeWs(iframeDoc.body.textContent || '') : '';
  r = checkBodyIndicators(bodyText);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S4: hide action link
  r = checkHideLink(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S5: "не видят" / "видно всем" body text
  r = checkBodyVisibilityText(bodyText);
  if (r.trace) trace.push(r.trace);
  if (r.visibility) return { visibility: r.visibility, trace };

  // S6: script JSON patterns
  r = checkScriptPatterns(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S7: notification/banner elements
  r = checkNotificationBanners(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // S8: action links with show/visible/publish in URL
  r = checkActionLinks(iframeDoc);
  if (tryStrategy(r, trace)) return { visibility: r.visibility, trace };

  // Final diagnostic dump
  const visElements = collectVisRelatedElements(iframeDoc);
  if (visElements.length > 0) {
    visLog.info('[VIS-IFRAME] Related elements: ' + JSON.stringify(visElements));
  }

  trace.push('→ UNKNOWN');
  visLog.info('[VIS-IFRAME] All strategies exhausted. Buttons found: ' + diagButtons.length +
    ', Related elements: ' + visElements.length);
  return { visibility: VISIBILITY_UNKNOWN, trace };
}
