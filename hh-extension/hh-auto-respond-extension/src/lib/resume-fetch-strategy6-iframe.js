/**
 * Strategy 6 — iframe sub-strategy.
 *
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 * Also detects visibility from the fully-hydrated DOM.
 *
 * Visibility detection extracted to resume-fetch-iframe-vis.js.
 */
import { createLogger } from './anti-hallucination.js';
import { parseCompanyCardFromDoc } from './resume-fetch-parse.js';
import { normalizeWs } from './resume-constants.js';
import { detectVisibilityFromIframeDoc } from './resume-fetch-iframe-vis.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 * Also detects visibility from the hydrated DOM.
 * @param {string} resumeUrl - Full URL of the resume page
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Promise<{entries: Array, iframeVis: string, iframeVisTrace: string[]}>}
 */
export async function fetchExpandedExperienceViaIframe(resumeUrl, currentCount) {
  fetchLog.info('Strategy 6 iframe: loading ' + resumeUrl);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;opacity:0;pointer-events:none;border:none;';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.src = resumeUrl;
  document.body.appendChild(iframe);

  try {
    // Wait for iframe to load (full page, including scripts)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('iframe load timeout (15s)')), 15000);
      iframe.addEventListener('load', () => { clearTimeout(timeout); resolve(); });
      iframe.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('iframe load error')); });
    });

    // Wait for React/Magritte hydration to complete
    await new Promise(r => setTimeout(r, 4000));

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document (cross-origin or blocked)');
    }

    // ═══ DIAGNOSTIC: dump iframe state for debugging ═══
    const iframeDiag = buildIframeDiag(iframeDoc, iframe);

    // ═══ VISIBILITY DETECTION from fully-hydrated iframe DOM ═══
    const iframeVisResult = detectVisibilityFromIframeDoc(iframeDoc);
    iframeVisResult.iframeDiag = iframeDiag;
    fetchLog.info('[VIS-DIAG] iframe visibility: ' + iframeVisResult.visibility +
      ' (trace: ' + iframeVisResult.trace.join(' → ') + ')');

    // Count experience cards before expansion
    const preCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const preSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info('Strategy 6 iframe: before expand — ' + preCards.length + ' company-cards, ' + preSteppers.length + ' stepper-items');

    // Click "Развернуть" buttons
    const clicked = clickExpandButtons(iframeDoc);
    fetchLog.info('Strategy 6 iframe: clicked ' + clicked + ' expand buttons');

    if (clicked > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }

    const postCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const postSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info('Strategy 6 iframe: after expand — ' + postCards.length + ' company-cards, ' + postSteppers.length + ' stepper-items');

    const entries = parseExperienceFromIframeDoc(iframeDoc);
    fetchLog.info('Strategy 6 iframe: parsed ' + entries.length + ' experience entries');

    return { entries, iframeVis: iframeVisResult.visibility, iframeVisTrace: iframeVisResult.trace, iframeDiag: iframeVisResult.iframeDiag };
  } finally {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch (e) { /* ignore */ }
  }
}

// ── Helpers ──

function buildIframeDiag(iframeDoc, iframe) {
  const diag = {};
  try {
    diag.finalUrl = iframe.contentWindow?.location?.href || '(no access)';
  } catch (e) { diag.finalUrl = '(cross-origin blocked: ' + e.message + ')'; }
  diag.title = iframeDoc.title || '(no title)';
  diag.bodyTextLen = iframeDoc.body ? (iframeDoc.body.textContent || '').length : 0;
  diag.bodyTextSnippet = iframeDoc.body
    ? normalizeWs(iframeDoc.body.textContent || '').substring(0, 1500)
    : '(no body)';

  const allQa = iframeDoc.querySelectorAll('[data-qa]');
  diag.dataQaList = Array.from(allQa).slice(0, 50).map(el => {
    const qa = el.getAttribute('data-qa') || '';
    const text = normalizeWs((el.textContent || '')).substring(0, 60);
    return qa + (text ? '="' + text + '"' : '');
  });

  const allActions = iframeDoc.querySelectorAll('button, a, [role="button"]');
  diag.actionTexts = Array.from(allActions).slice(0, 30).map(el => {
    return normalizeWs((el.textContent || '')).substring(0, 50);
  }).filter(t => t.length > 2);

  fetchLog.info('[VIS-IFRAME-DIAG] url=' + diag.finalUrl);
  fetchLog.info('[VIS-IFRAME-DIAG] title="' + diag.title + '"');
  fetchLog.info('[VIS-IFRAME-DIAG] bodyLen=' + diag.bodyTextLen);
  fetchLog.info('[VIS-IFRAME-DIAG] bodySnippet=' + diag.bodyTextSnippet.substring(0, 500));
  fetchLog.info('[VIS-IFRAME-DIAG] dataQa count=' + allQa.length + ', sample: ' + JSON.stringify(diag.dataQaList.slice(0, 20)));
  fetchLog.info('[VIS-IFRAME-DIAG] actions: ' + JSON.stringify(diag.actionTexts));

  return diag;
}

function clickExpandButtons(iframeDoc) {
  const expandButtons = iframeDoc.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
  let clicked = 0;
  expandButtons.forEach(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('развернуть') || text.includes('показать все') ||
        text.includes('показать ещё') || text.includes('посмотреть всё') ||
        text.includes('посмотреть все') || text.includes('expand')) {
      try { btn.click(); clicked++; } catch (e) { /* ignore */ }
    }
  });
  return clicked;
}

/**
 * Parse experience entries from an iframe document.
 * Uses the same parsing strategies as parseExperienceFromDoc()
 * but works on the iframe's fully-rendered DOM.
 */
function parseExperienceFromIframeDoc(iframeDoc) {
  const allCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach(c => { if (!seen.has(c)) { seen.add(c); uniqueCards.push(c); } });

  const entries = [];
  const usedStepperElements = new Set();

  // Strategy 1: Parse company cards
  uniqueCards.forEach(card => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  // Strategy 2: Parse stepper items NOT covered by company cards
  const expCard = iframeDoc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    stepperItems.forEach(step => {
      if (usedStepperElements.has(step)) return;
      let parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position || job.period) entries.push(job);
    });
  }

  // Strategy 3: If still 0, try all stepper items directly
  if (entries.length === 0 && expCard) {
    const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    allStepperItems.forEach(step => {
      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || '').trim();
      if (texts.length >= 2) job.period = (texts[1].textContent || '').trim().replace(/\s*\(\d[^)]+\)$/, '').trim();
      if (job.position) entries.push(job);
    });
  }

  return entries;
}
