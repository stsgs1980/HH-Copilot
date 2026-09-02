/**
 * LIB: RESUME FETCH IFRAME HELPERS
 * =================================
 * Helpers extracted from resume-fetch-strategy6-iframe.js (AHG Rule 12):
 * - buildIframeDiag: diagnostic dump of iframe DOM state
 * - clickExpandButtons: click "Развернуть" buttons to expand experience
 * - parseExperienceFromIframeDoc: parse experience from fully-rendered iframe DOM
 */

import { createLogger } from "./anti-hallucination.js";
import { normalizeWs } from "./resume-constants.js";
import { parseCompanyCardFromDoc } from "./resume-fetch-parse.js";

const helperLog = createLogger("ResumeFetch");

export function buildIframeDiag(iframeDoc, iframe) {
  const diag = {};
  try {
    diag.finalUrl = iframe.contentWindow?.location?.href || "(no access)";
  } catch (e) {
    diag.finalUrl = "(cross-origin blocked: " + e.message + ")";
  }
  diag.title = iframeDoc.title || "(no title)";
  diag.bodyTextLen = iframeDoc.body ? (iframeDoc.body.textContent || "").length : 0;
  diag.bodyTextSnippet = iframeDoc.body
    ? normalizeWs(iframeDoc.body.textContent || "").substring(0, 1500)
    : "(no body)";

  const allQa = iframeDoc.querySelectorAll("[data-qa]");
  diag.dataQaList = Array.from(allQa)
    .slice(0, 50)
    .map((el) => {
      const qa = el.getAttribute("data-qa") || "";
      const text = normalizeWs(el.textContent || "").substring(0, 60);
      return qa + (text ? '="' + text + '"' : "");
    });

  const allActions = iframeDoc.querySelectorAll('button, a, [role="button"]');
  diag.actionTexts = Array.from(allActions)
    .slice(0, 30)
    .map((el) => {
      return normalizeWs(el.textContent || "").substring(0, 50);
    })
    .filter((t) => t.length > 2);

  helperLog.info("[VIS-IFRAME-DIAG] url=" + diag.finalUrl);
  helperLog.info('[VIS-IFRAME-DIAG] title="' + diag.title + '"');
  helperLog.info("[VIS-IFRAME-DIAG] bodyLen=" + diag.bodyTextLen);
  helperLog.info("[VIS-IFRAME-DIAG] bodySnippet=" + diag.bodyTextSnippet.substring(0, 500));
  helperLog.info(
    "[VIS-IFRAME-DIAG] dataQa count=" + allQa.length + ", sample: " + JSON.stringify(diag.dataQaList.slice(0, 20)),
  );
  helperLog.info("[VIS-IFRAME-DIAG] actions: " + JSON.stringify(diag.actionTexts));

  return diag;
}

export function clickExpandButtons(iframeDoc) {
  const expandButtons = iframeDoc.querySelectorAll('[data-qa="profile-experience-viewAll"], button');
  let clicked = 0;
  expandButtons.forEach((btn) => {
    const text = (btn.textContent || "").trim().toLowerCase();
    if (
      text.includes("развернуть") ||
      text.includes("показать все") ||
      text.includes("показать ещё") ||
      text.includes("посмотреть всё") ||
      text.includes("посмотреть все") ||
      text.includes("expand")
    ) {
      try {
        btn.click();
        clicked++;
      } catch (_e) {
        /* ignore */
      }
    }
  });
  return clicked;
}

/**
 * Parse experience entries from an iframe document.
 * Uses the same parsing strategies as parseExperienceFromDoc()
 * but works on the iframe's fully-rendered DOM.
 */
export function parseExperienceFromIframeDoc(iframeDoc) {
  const allCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
  const seen = new Set();
  const uniqueCards = [];
  allCards.forEach((c) => {
    if (!seen.has(c)) {
      seen.add(c);
      uniqueCards.push(c);
    }
  });

  const entries = [];
  const usedStepperElements = new Set();

  uniqueCards.forEach((card) => {
    const job = parseCompanyCardFromDoc(card);
    if (job) entries.push(job);
    const stepEl = card.querySelector('[data-qa="magritte-stepper-step-content"]');
    if (stepEl) usedStepperElements.add(stepEl);
  });

  const expCard = iframeDoc.querySelector('[data-qa="resume-list-card-experience"]');
  if (expCard) {
    const stepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    stepperItems.forEach((step) => {
      if (usedStepperElements.has(step)) return;
      const parentCard = step.closest('[data-qa="profile-experience-company-card"]');
      if (parentCard && uniqueCards.includes(parentCard)) return;

      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
      if (texts.length >= 2)
        job.period = (texts[1].textContent || "")
          .trim()
          .replace(/\s*\(\d[^)]+\)$/, "")
          .trim();
      if (job.position || job.period) entries.push(job);
    });
  }

  if (entries.length === 0 && expCard) {
    const allStepperItems = expCard.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    allStepperItems.forEach((step) => {
      const cellLeft = step.querySelector('[data-qa="cell-left-side"]');
      if (!cellLeft) return;
      const texts = cellLeft.querySelectorAll('[data-qa="cell-text-content"]');
      const job = {};
      if (texts.length >= 1) job.position = (texts[0].textContent || "").trim();
      if (texts.length >= 2)
        job.period = (texts[1].textContent || "")
          .trim()
          .replace(/\s*\(\d[^)]+\)$/, "")
          .trim();
      if (job.position) entries.push(job);
    });
  }

  return entries;
}
