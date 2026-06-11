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
      console.log("    list: " + r.listVis + " | page: " + r.pageVis + " | iframe: " + (r.iframeVis || "-") + " | reason: " + r.decisionReason);
      if (r.pageTrace && r.pageTrace.length > 0) {
        console.log("    trace:", r.pageTrace.join(" \u2192 "));
      }
      if (r.iframeDiag) {
        console.log("    iframe URL:", r.iframeDiag.finalUrl);
        console.log("    iframe title:", r.iframeDiag.title);
        console.log("    iframe bodyLen:", r.iframeDiag.bodyTextLen);
        console.log("    iframe bodySnippet:", r.iframeDiag.bodyTextSnippet ? r.iframeDiag.bodyTextSnippet.substring(0, 300) : "(empty)");
        if (r.iframeDiag.dataQaList && r.iframeDiag.dataQaList.length > 0) {
          console.log("    iframe dataQa (" + r.iframeDiag.dataQaList.length + "):", r.iframeDiag.dataQaList.slice(0, 15));
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
        iframeVis: r.iframeVis || "-",
        final: r.finalVisibility,
        reason: (r.decisionReason || "").substring(0, 60)
      };
    }));
    return d.resumes;
  };
  window.__hhVacDiagData = null;
  window.addEventListener("message", function(event) {
    if (!event.data || event.data.type !== "HH-AR-VAC-DIAG") return;
    window.__hhVacDiagData = event.data.payload;
    console.log("%c[HH-AR][VAC-DIAG] Data updated \u2014 use __hhVacDiag()", "color:#3b82f6;font-weight:bold");
  });
  window.__hhVacDiag = function() {
    if (!window.__hhVacDiagData) {
      console.log("%c[HH-AR][VAC-DIAG] Requesting data from content script...", "color:#3b82f6;font-weight:bold");
      document.dispatchEvent(new CustomEvent("HH-AR-RUN-VAC-DIAG"));
      console.log("%c[HH-AR][VAC-DIAG] Wait 1 second, then run __hhVacDiag() again.", "color:#f59e0b;font-weight:bold");
      return null;
    }
    var d = window.__hhVacDiagData;
    console.log("%c[HH-AR][VAC-DIAG] \u2550\u2550\u2550 VACANCY PAGE DIAGNOSTIC \u2550\u2550\u2550", "color:#3b82f6;font-weight:bold;font-size:14px");
    console.log("URL:", d.url);
    console.log("Vacancy ID:", d.vacancyId);
    console.log("Timestamp:", d.timestamp);
    console.group("%c1. Known Selectors", "color:#3b82f6;font-weight:bold");
    Object.keys(d.selectors || {}).forEach(function(key) {
      var s = d.selectors[key];
      var icon = s.found ? "%c\u2713" : "%c\u2717";
      var color = s.found ? "color:#22c55e" : "color:#ef4444";
      console.log(icon + " " + key + "%c  " + (s.matchedSelector || "(none matched)"), color, "color:#71717a");
      if (s.found) {
        console.log("   tag=%s  data-qa=%s  text=%s", s.tag, s.dataQa, (s.text || "").substring(0, 80));
        if (s.items) console.log("   items (" + s.count + "):", s.items);
        if (s.htmlLength) console.log("   htmlLen=%d  textLen=%d", s.htmlLength, s.textLength);
      }
    });
    console.groupEnd();
    console.group("%c2. Auto-Detected Fields", "color:#3b82f6;font-weight:bold");
    var auto = d.autoDetect || {};
    ["title", "company", "salary", "location", "experience", "employment", "schedule"].forEach(function(field) {
      var f = auto[field];
      if (!f) return;
      var icon = f.value ? "%c\u2713" : "%c\u2717";
      var color = f.value ? "color:#22c55e" : "color:#ef4444";
      console.log(icon + " " + field + "%c  src=" + (f.source || "-") + "  value=" + (f.value || "(null)"), color, "color:#71717a");
    });
    if (auto.keySkills && auto.keySkills.value) {
      console.log("%c\u2713 keySkills%c  src=" + auto.keySkills.source + "  count=" + auto.keySkills.count, "color:#22c55e", "color:#71717a");
      console.log("   ", auto.keySkills.value);
    }
    if (auto.description && auto.description.found) {
      console.log("%c\u2713 description%c  src=" + auto.description.source + "  textLen=" + auto.description.textLength, "color:#22c55e", "color:#71717a");
      console.log("   headings:", auto.description.headings);
      console.log("   snippet:", auto.description.textSnippet);
    }
    if (auto.brandedDescription && auto.brandedDescription.found) {
      console.log("%c\u2713 brandedDescription%c  textLen=" + auto.brandedDescription.textLength, "color:#22c55e", "color:#71717a");
    }
    console.groupEnd();
    console.group("%c3. All data-qa Groups (" + (auto.dataQaCount || 0) + " prefixes)", "color:#3b82f6;font-weight:bold");
    if (auto.dataQaGroups) {
      Object.keys(auto.dataQaGroups).sort().forEach(function(prefix) {
        var items = auto.dataQaGroups[prefix];
        console.log("  " + prefix + " (" + items.length + "):", items.map(function(i) {
          return i.qa;
        }).join(", "));
      });
    }
    console.groupEnd();
    console.group("%c4. Info Blocks (" + ((d.rawData || {}).infoBlocks || []).length + ")", "color:#3b82f6;font-weight:bold");
    if (d.rawData && d.rawData.infoBlocks) {
      d.rawData.infoBlocks.forEach(function(b) {
        console.log("  %s  tag=%s  children=%d  text=%s", b.dataQa, b.tag, b.children, b.text.substring(0, 80));
      });
    }
    console.groupEnd();
    console.log("%c[HH-AR][VAC-DIAG] Full data: window.__hhVacDiagData", "color:#71717a");
    return d;
  };
  console.log("%c[HH-AR][VIS-DIAG] Console helpers ready: __hhVis() / __hhVisTable() / __hhVacDiag()", "color:#71717a;font-size:11px");
  (function setupSPANavigation() {
    var origPush = history.pushState;
    history.pushState = function() {
      origPush.apply(this, arguments);
      document.dispatchEvent(new CustomEvent("hh-ar-spa-navigate", {
        detail: { path: window.location.pathname, source: "pushState" }
      }));
    };
    var origReplace = history.replaceState;
    history.replaceState = function() {
      origReplace.apply(this, arguments);
      document.dispatchEvent(new CustomEvent("hh-ar-spa-navigate", {
        detail: { path: window.location.pathname, source: "replaceState" }
      }));
    };
    document.addEventListener("click", function(e) {
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href) return;
      if (link.target === "_blank") return;
      var isVacancy = /^\/vacancy\/\d+/.test(href) || /hh\.ru\/vacancy\/\d+/.test(href);
      var isResume = /^\/resume\/[a-f0-9]+/.test(href);
      if (!isVacancy && !isResume) return;
      var targetPath;
      try {
        targetPath = new URL(href, window.location.origin).pathname;
      } catch (_) {
        return;
      }
      if (window.location.pathname === targetPath) return;
      e.preventDefault();
      setTimeout(function() {
        if (window.location.pathname !== targetPath) return;
        history.pushState({}, "", href);
      }, 150);
    }, true);
    console.log("%c[HH-AR][SPA] Navigation interception active", "color:#71717a;font-size:11px");
  })();
})();
