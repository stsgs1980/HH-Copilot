/**
 * Strategy 6 — iframe sub-strategy.
 *
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 *
 * Split from resume-fetch-strategy6-expand.js for modularity.
 */
import { createLogger } from './anti-hallucination.js';
import { parseCompanyCardFromDoc } from './resume-fetch-parse.js';

const fetchLog = createLogger('ResumeFetch');

/**
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 * @param {string} resumeUrl - Full URL of the resume page
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Promise<Array>} Parsed experience entries from the iframe DOM
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
    await new Promise(r => setTimeout(r, 2500));

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document (cross-origin or blocked)');
    }

    // Count experience cards before expansion
    const preCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const preSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info('Strategy 6 iframe: before expand — ' + preCards.length + ' company-cards, ' + preSteppers.length + ' stepper-items');

    // Click "Развернуть" buttons
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
    fetchLog.info('Strategy 6 iframe: clicked ' + clicked + ' expand buttons');

    if (clicked > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }

    const postCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const postSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info('Strategy 6 iframe: after expand — ' + postCards.length + ' company-cards, ' + postSteppers.length + ' stepper-items');

    const entries = parseExperienceFromIframeDoc(iframeDoc);
    fetchLog.info('Strategy 6 iframe: parsed ' + entries.length + ' experience entries');

    return entries;
  } finally {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch (e) { /* ignore */ }
  }
}

/**
 * Parse experience entries from an iframe document.
 * Uses the same parsing strategies as parseExperienceFromDoc()
 * but works on the iframe's fully-rendered DOM.
 * @param {Document} iframeDoc - The iframe's contentDocument
 * @returns {Array} Parsed experience entries
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
