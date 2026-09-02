/**
 * PAGE WORLD: VISIBILITY DIAGNOSTICS
 * =================================================
 * Console helpers for resume visibility diagnostic.
 * Extracted from page-world.js (AHG Rule 12).
 */

window.__hhVisDiag = null;

window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "HH-AR-VISDIAG") return;

  window.__hhVisDiag = event.data.payload;
  console.log("%c[HH-AR][VIS-DIAG] Data updated -- use __hhVis() or __hhVisTable()", "color:#22c55e;font-weight:bold");
});

/**
 * Console helper: print a formatted visibility diagnostic report.
 * Usage: __hhVis() -- after running "Синхронизировать все" in the panel.
 */
window.__hhVis = function () {
  const d = window.__hhVisDiag;
  if (!d) {
    console.log(
      '%c[HH-AR][VIS-DIAG] No sync data yet. Run "Синхронизировать все" first.',
      "color:#f59e0b;font-weight:bold",
    );
    return;
  }

  console.log(
    "%c[HH-AR][VIS-DIAG] === VISIBILITY DIAGNOSTIC DUMP ===",
    "color:#2964FF;font-weight:bold;font-size:14px",
  );
  console.log("Started:", d.startedAt);
  console.log("Finished:", d.finishedAt);
  console.log("List source:", d.listSource, "| HTML length:", d.listRawHtmlLength);
  console.log("%cSummary:", "font-weight:bold", d.summary);

  if (d.error) {
    console.log("%cFATAL ERROR: " + d.error, "color:#ef4444;font-weight:bold");
  }

  console.group("%cPer-resume details:", "color:#2964FF;font-weight:bold");
  (d.resumes || []).forEach(function (r) {
    const color = r.finalVisibility === "visible" ? "#22c55e" : r.finalVisibility === "hidden" ? "#ef4444" : "#f59e0b";
    console.log(
      "%c  " +
        (r.id ? r.id.substring(0, 8) : "?") +
        ' "' +
        (r.title || "").substring(0, 40) +
        '" -> %c' +
        r.finalVisibility,
      "font-weight:bold",
      "color:" + color + ";font-weight:bold",
    );
    console.log(
      "    list: " +
        r.listVis +
        " | page: " +
        r.pageVis +
        " | iframe: " +
        (r.iframeVis || "-") +
        " | reason: " +
        r.decisionReason,
    );
    if (r.pageTrace && r.pageTrace.length > 0) {
      console.log("    trace:", r.pageTrace.join(" -> "));
    }
    if (r.iframeDiag) {
      console.log("    iframe URL:", r.iframeDiag.finalUrl);
      console.log("    iframe title:", r.iframeDiag.title);
      console.log("    iframe bodyLen:", r.iframeDiag.bodyTextLen);
      console.log(
        "    iframe bodySnippet:",
        r.iframeDiag.bodyTextSnippet ? r.iframeDiag.bodyTextSnippet.substring(0, 300) : "(empty)",
      );
      if (r.iframeDiag.dataQaList && r.iframeDiag.dataQaList.length > 0) {
        console.log(
          "    iframe dataQa (" + r.iframeDiag.dataQaList.length + "):",
          r.iframeDiag.dataQaList.slice(0, 15),
        );
      }
      if (r.iframeDiag.actionTexts && r.iframeDiag.actionTexts.length > 0) {
        console.log("    iframe actions:", r.iframeDiag.actionTexts);
      }
    }
  });
  console.groupEnd();

  console.log("%c[HH-AR][VIS-DIAG] Full data: window.__hhVisDiag", "color:#71717a");
  console.log("%c[HH-AR][VIS-DIAG] Quick table: window.__hhVisTable()", "color:#71717a");
  return d;
};

/**
 * Console helper: print a compact table of all resume visibility.
 */
window.__hhVisTable = function () {
  const d = window.__hhVisDiag;
  if (!d) {
    console.log(
      '%c[HH-AR][VIS-DIAG] No sync data yet. Run "Синхронизировать все" first.',
      "color:#f59e0b;font-weight:bold",
    );
    return;
  }
  console.table(
    (d.resumes || []).map(function (r) {
      return {
        id: r.id ? r.id.substring(0, 12) : "?",
        title: (r.title || "").substring(0, 35),
        listVis: r.listVis,
        pageVis: r.pageVis,
        iframeVis: r.iframeVis || "-",
        final: r.finalVisibility,
        reason: (r.decisionReason || "").substring(0, 60),
      };
    }),
  );
  return d.resumes;
};
