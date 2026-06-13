/**
 * Resume page-level visibility detection.
 * Detects visibility from the resume detail page HTML (fetched via fetchHtml).
 * More reliable than list-page detection because hh.ru includes visibility
 * indicators in the resume detail SSR HTML and React hydration.
 *
 * Split from resume-fetch-resume.js for anti-monolith compliance.
 */
import { createLogger } from './anti-hallucination.js';
import {
  VISIBILITY_VISIBLE, VISIBILITY_HIDDEN, VISIBILITY_UNKNOWN,
  HIDDEN_INDICATORS, VISIBILITY_HIDDEN_DATA_QA,
  hasHiddenIndicator, hasVisibleIndicator, normalizeWs
} from './resume-constants.js';

const visLog = createLogger('ResumeFetch');

/**
 * Detect visibility status from the resume detail page HTML.
 *
 * Strategies:
 * 0. data-qa="resume-visibility-card" (PRIMARY for Magritte — "не видно никому" / "видно всем")
 * 1. Hidden-specific data-qa attributes (resume-make-visible, resume-status-hidden)
 * 2. Button text ("Сделать видимым" = hidden, "Скрыть резюме" = visible)
 * 3. Page body text for hidden/visible indicators
 * 4. Raw HTML search with &nbsp; normalization
 * 5. Script/hydration JSON ("hidden": true)
 * 6. "Скрыть" action link (means resume IS visible)
 *
 * @param {Document} doc - Parsed document from DOMParser
 * @param {string} html - Raw HTML string
 * @returns {{ visibility: string, trace: string[] }}
 */
export function detectVisibilityFromResumePage(doc, html) {
  const diag = []; // diagnostic trace — every step logged

  // ═══ Strategy 0: Check resume-visibility-card (PRIMARY for Magritte) ═══
  const visCard = doc.querySelector('[data-qa="resume-visibility-card"]');
  if (visCard) {
    const cardText = normalizeWs(visCard.textContent || '').toLowerCase();
    if (cardText.includes('не видно никому') || cardText.includes('не\u00A0видно никому')) {
      diag.push('S0:visibility-card="не видно никому" → HIDDEN');
      visLog.info('[VIS-DIAG] ' + diag.join(' | '));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
    if (cardText.includes('видно всем') || cardText.includes('видно\u00A0всем')) {
      diag.push('S0:visibility-card="видно всем" → VISIBLE');
      visLog.info('[VIS-DIAG] ' + diag.join(' | '));
      return { visibility: VISIBILITY_VISIBLE, trace: diag };
    }
    diag.push('S0:visibility-card-unknown="' + cardText.substring(0, 40) + '"');
  } else {
    diag.push('S0:no-visibility-card');
  }

  // ═══ Strategy 1: Check for hidden-specific data-qa attributes ═══
  for (const sel of VISIBILITY_HIDDEN_DATA_QA) {
    const found = doc.querySelector(sel);
    if (found) {
      diag.push('S1:data-qa=' + sel + ' → HIDDEN');
      visLog.info('[VIS-DIAG] ' + diag.join(' | '));
      return { visibility: VISIBILITY_HIDDEN, trace: diag };
    }
  }
  diag.push('S1:no-data-qa-hidden');

  // ═══ Strategy 2: Check for "Сделать видимым" / "Скрыть резюме" buttons ═══
  const allButtons = doc.querySelectorAll('button, a');
  let btnDetails = [];
  for (const btn of allButtons) {
    const text = normalizeWs((btn.textContent || '')).toLowerCase();
    const qa = (btn.getAttribute('data-qa') || '').toLowerCase();
    if (text.includes('скрыть') || text.includes('видим')) {
      btnDetails.push('"' + text.substring(0, 40) + '"' + (qa ? '[qa=' + qa + ']' : ''));
    }
    if (text.includes('сделать видимым')) {
      diag.push('S2:btn="сделать видимым" → HIDDEN');
      visLog.info('[VIS-DIAG] ' + diag.join(' | '));
      visLog.info('[VIS-DIAG] All vis-related buttons: ' + JSON.stringify(btnDetails));
      return { visibility: VISIBILITY_HIDDEN, trace: diag, btnDetails };
    }
    if (text.includes('скрыть резюме')) {
      diag.push('S2:btn="скрыть резюме" → VISIBLE');
      visLog.info('[VIS-DIAG] ' + diag.join(' | '));
      visLog.info('[VIS-DIAG] All vis-related buttons: ' + JSON.stringify(btnDetails));
      return { visibility: VISIBILITY_VISIBLE, trace: diag, btnDetails };
    }
  }
  diag.push('S2:no-key-buttons' + (btnDetails.length ? '(saw:' + btnDetails.length + ' partial)' : ''));

  // ═══ Strategy 3: Check page body text for hidden/visible indicators ═══
  const bodyText = doc.body ? normalizeWs(doc.body.textContent || '') : '';
  if (hasHiddenIndicator(bodyText)) {
    const lower = bodyText.toLowerCase();
    for (const ind of ['многие не видят', 'сделать видимым', 'не видно']) {
      const pos = lower.indexOf(ind);
      if (pos !== -1) {
        diag.push('S3:body has "' + ind + '" @' + pos + ' → HIDDEN');
        break;
      }
    }
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_HIDDEN, trace: diag };
  }
  if (hasVisibleIndicator(bodyText)) {
    diag.push('S3:body has visible indicator → VISIBLE');
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_VISIBLE, trace: diag };
  }
  diag.push('S3:body-no-indicators');

  // ═══ Strategy 4: Check raw HTML for hidden/visible indicators (with &nbsp; normalization) ═══
  const htmlForSearch = html.replace(/&nbsp;/g, ' ').toLowerCase();
  const htmlNorm = normalizeWs(htmlForSearch);
  if (hasHiddenIndicator(htmlNorm)) {
    const lower = htmlNorm.toLowerCase();
    for (const ind of ['многие не видят', 'сделать видимым', 'не видно']) {
      const pos = lower.indexOf(ind);
      if (pos !== -1) {
        diag.push('S4:html has "' + ind + '" @' + pos + ' → HIDDEN');
        break;
      }
    }
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_HIDDEN, trace: diag };
  }
  if (hasVisibleIndicator(htmlNorm)) {
    diag.push('S4:html has visible indicator → VISIBLE');
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_VISIBLE, trace: diag };
  }
  diag.push('S4:html-no-indicators');

  // ═══ Strategy 5: Check script/hydration JSON for hidden status ═══
  const scriptEls = doc.querySelectorAll('script:not([src])');
  let scriptPatterns = [];
  for (const script of scriptEls) {
    const t = script.textContent || '';
    if (t.length < 50) continue;
    const patterns = [
      { re: /"hidden"\s*:\s*true/, name: '"hidden":true' },
      { re: /"isHidden"\s*:\s*true/, name: '"isHidden":true' },
      { re: /"visibility"\s*:\s*"hidden"/, name: '"visibility":"hidden"' },
      { re: /"status"\s*:\s*"hidden"/, name: '"status":"hidden"' },
    ];
    for (const p of patterns) {
      if (p.re.test(t)) scriptPatterns.push(p.name);
    }
  }
  if (scriptPatterns.length > 0) {
    diag.push('S5:script=' + scriptPatterns.join(',') + ' → HIDDEN');
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_HIDDEN, trace: diag, scriptPatterns };
  }
  diag.push('S5:no-script-patterns');

  // ═══ Strategy 6: If we find a "Скрыть" action link/button specific to this resume ═══
  const hideLink = doc.querySelector('[data-qa="resume-action-hide"], [data-qa*="resume-hide"], a[data-qa*="hide-resume"]');
  if (hideLink) {
    const hideQa = hideLink.getAttribute('data-qa') || '';
    diag.push('S6:hide-link qa=' + hideQa + ' → VISIBLE');
    visLog.info('[VIS-DIAG] ' + diag.join(' | '));
    return { visibility: VISIBILITY_VISIBLE, trace: diag };
  }
  diag.push('S6:no-hide-link');

  // Extra: dump all hide-related data-qa for diagnostic
  const allHideBtns = doc.querySelectorAll('[data-qa*="hide"], [data-qa*="hidden"]');
  if (allHideBtns.length > 0) {
    const hideQas = Array.from(allHideBtns).map(b => b.getAttribute('data-qa')).filter(Boolean);
    diag.push('EXTRA:hide-qa=' + hideQas.join(','));
  }

  diag.push('→ UNKNOWN');
  visLog.info('[VIS-DIAG] ' + diag.join(' | '));
  return { visibility: VISIBILITY_UNKNOWN, trace: diag };
}


