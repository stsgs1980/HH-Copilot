/**
 * PAGE WORLD SCRIPT -- runs in the page's MAIN world (not isolated).
 * This file is injected as a content script with "world": "MAIN" in manifest.json.
 *
 * Purpose: Expose __hhVis() / __hhVisTable() / __hhVacDiag() to the browser console
 * and patch SPA navigation for content script communication.
 *
 * Split from monolith (AHG Rule 12):
 *   - page-world-vis.js -- visibility diagnostics (__hhVis)
 *   - page-world-vac.js -- vacancy diagnostics (__hhVacDiag)
 *   - this file         -- SPA bridge + bootstrap
 */

import "./page-world-vac.js";
import "./page-world-vis.js";

console.log(
  "%c[HH-AR][VIS-DIAG] Console helpers ready: __hhVis() / __hhVisTable() / __hhVacDiag()",
  "color:#71717a;font-size:11px",
);

// ===============================================
// SPA NAVIGATION -- pushState patch for content script communication
// ===============================================
//
// Problem: Content script runs in isolated world and can't intercept
// pushState/replaceState calls made by hh.ru's own JavaScript.
// Solution: Patch pushState in MAIN world and dispatch a CustomEvent
// that the content script can listen to.
//
// NOTE: We do NOT intercept link clicks here. hh.ru has its own SPA router
// that handles in-page navigation via pushState. Our click interception was
// breaking navigation because pushState alone doesn't trigger hh.ru's router
// to load new page content -- it only changes the URL bar.

(function setupSPANavigation() {
  const origPush = history.pushState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    document.dispatchEvent(
      new CustomEvent("hh-ar-spa-navigate", {
        detail: { path: window.location.pathname, source: "pushState" },
      }),
    );
  };

  const origReplace = history.replaceState;
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    document.dispatchEvent(
      new CustomEvent("hh-ar-spa-navigate", {
        detail: { path: window.location.pathname, source: "replaceState" },
      }),
    );
  };

  console.log("%c[HH-AR][SPA] pushState/replaceState patches active", "color:#71717a;font-size:11px");
})();
