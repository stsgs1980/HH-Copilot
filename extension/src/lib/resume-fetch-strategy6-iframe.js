/**
 * Strategy 6 -- iframe sub-strategy.
 *
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 * Also detects visibility from the fully-hydrated DOM.
 *
 * Helpers extracted to resume-fetch-iframe-helpers.js (AHG Rule 12).
 * Visibility detection extracted to resume-fetch-iframe-vis.js.
 */
import { createLogger } from "./anti-hallucination.js";
import { buildIframeDiag, clickExpandButtons, parseExperienceFromIframeDoc } from "./resume-fetch-iframe-helpers.js";
import { detectVisibilityFromIframeDoc } from "./resume-fetch-iframe-vis.js";

const fetchLog = createLogger("ResumeFetch");

/**
 * Load the resume page in a hidden iframe, click "Развернуть" buttons
 * to expand all experience entries, then parse the fully-rendered DOM.
 * Also detects visibility from the hydrated DOM.
 * @param {string} resumeUrl - Full URL of the resume page
 * @param {number} currentCount - Number of experience entries already found
 * @returns {Promise<{entries: Array, iframeVis: string, iframeVisTrace: string[]}>}
 */
export async function fetchExpandedExperienceViaIframe(resumeUrl, _currentCount) {
  fetchLog.info("Strategy 6 iframe: loading " + resumeUrl);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;opacity:0;pointer-events:none;border:none;";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  iframe.src = resumeUrl;
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("iframe load timeout (15s)")), 15000);
      iframe.addEventListener("load", () => {
        clearTimeout(timeout);
        resolve();
      });
      iframe.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("iframe load error"));
      });
    });

    await new Promise((r) => setTimeout(r, 4000));

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("Cannot access iframe document (cross-origin or blocked)");
    }

    const iframeDiag = buildIframeDiag(iframeDoc, iframe);

    const iframeVisResult = detectVisibilityFromIframeDoc(iframeDoc);
    iframeVisResult.iframeDiag = iframeDiag;
    fetchLog.info(
      "[VIS-DIAG] iframe visibility: " +
        iframeVisResult.visibility +
        " (trace: " +
        iframeVisResult.trace.join(" -> ") +
        ")",
    );

    const preCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const preSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info(
      "Strategy 6 iframe: before expand -- " +
        preCards.length +
        " company-cards, " +
        preSteppers.length +
        " stepper-items",
    );

    const clicked = clickExpandButtons(iframeDoc);
    fetchLog.info("Strategy 6 iframe: clicked " + clicked + " expand buttons");

    if (clicked > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    const postCards = iframeDoc.querySelectorAll('[data-qa="profile-experience-company-card"]');
    const postSteppers = iframeDoc.querySelectorAll('[data-qa="magritte-stepper-step-content"]');
    fetchLog.info(
      "Strategy 6 iframe: after expand -- " +
        postCards.length +
        " company-cards, " +
        postSteppers.length +
        " stepper-items",
    );

    const entries = parseExperienceFromIframeDoc(iframeDoc);
    fetchLog.info("Strategy 6 iframe: parsed " + entries.length + " experience entries");

    return {
      entries,
      iframeVis: iframeVisResult.visibility,
      iframeVisTrace: iframeVisResult.trace,
      iframeDiag: iframeVisResult.iframeDiag,
    };
  } finally {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch (_e) {
      /* ignore */
    }
  }
}
