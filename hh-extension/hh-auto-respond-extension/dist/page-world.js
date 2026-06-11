(() => {
  window.__hhVisDiag = null;
  window.addEventListener("message", function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== "HH-AR-VISDIAG") return;
    window.__hhVisDiag = event.data.payload;
    console.log("%c[HH-AR][VIS-DIAG] Data updated \u2014 use __hhVis() or __hhVisTable()", "color:#22c55e;font-weight:bold");
  });
  window.__hhVis = function() {
    var d = window.__hhVisDiag;
    if (!d) {
      console.log('%c[HH-AR][VIS-DIAG] No sync data yet. Run "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435" first.', "color:#f59e0b;font-weight:bold");
      return;
    }
    console.log("%c[HH-AR][VIS-DIAG] \u2550\u2550\u2550 VISIBILITY DIAGNOSTIC DUMP \u2550\u2550\u2550", "color:#2964FF;font-weight:bold;font-size:14px");
    console.log("Started:", d.startedAt);
    console.log("Finished:", d.finishedAt);
    console.log("List source:", d.listSource, "| HTML length:", d.listRawHtmlLength);
    console.log("%cSummary:", "font-weight:bold", d.summary);
    if (d.error) {
      console.log("%cFATAL ERROR: " + d.error, "color:#ef4444;font-weight:bold");
    }
    console.group("%cPer-resume details:", "color:#2964FF;font-weight:bold");
    (d.resumes || []).forEach(function(r) {
      var color = r.finalVisibility === "visible" ? "#22c55e" : r.finalVisibility === "hidden" ? "#ef4444" : "#f59e0b";
      console.log("%c  " + (r.id ? r.id.substring(0, 8) : "?") + ' "' + (r.title || "").substring(0, 40) + '" \u2192 %c' + r.finalVisibility, "font-weight:bold", "color:" + color + ";font-weight:bold");
      console.log("    list: " + r.listVis + " | page: " + r.pageVis + " | reason: " + r.decisionReason);
      if (r.pageTrace && r.pageTrace.length > 0) {
        console.log("    trace:", r.pageTrace.join(" \u2192 "));
      }
    });
    console.groupEnd();
    console.log("%c[HH-AR][VIS-DIAG] Full data: window.__hhVisDiag", "color:#71717a");
    console.log("%c[HH-AR][VIS-DIAG] Quick table: window.__hhVisTable()", "color:#71717a");
    return d;
  };
  window.__hhVisTable = function() {
    var d = window.__hhVisDiag;
    if (!d) {
      console.log('%c[HH-AR][VIS-DIAG] No sync data yet. Run "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u0441\u0435" first.', "color:#f59e0b;font-weight:bold");
      return;
    }
    console.table((d.resumes || []).map(function(r) {
      return {
        id: r.id ? r.id.substring(0, 12) : "?",
        title: (r.title || "").substring(0, 35),
        listVis: r.listVis,
        pageVis: r.pageVis,
        final: r.finalVisibility,
        reason: (r.decisionReason || "").substring(0, 50)
      };
    }));
    return d.resumes;
  };
  console.log("%c[HH-AR][VIS-DIAG] Console helpers ready: __hhVis() / __hhVisTable()", "color:#71717a;font-size:11px");
})();
