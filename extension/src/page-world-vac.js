/**
 * PAGE WORLD: VACANCY DIAGNOSTICS
 * =================================================
 * Console helpers for vacancy page diagnostic.
 * Extracted from page-world.js (AHG Rule 12).
 */

window.__hhVacDiagData = null;

window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "HH-AR-VAC-DIAG") return;

  window.__hhVacDiagData = event.data.payload;
  console.log("%c[HH-AR][VAC-DIAG] Data updated -- use __hhVacDiag()", "color:#3b82f6;font-weight:bold");
});

/**
 * Console helper: print a formatted vacancy page diagnostic.
 * Usage: Open any /vacancy/{id} page, then type __hhVacDiag() in console.
 */
window.__hhVacDiag = function () {
  if (!window.__hhVacDiagData) {
    console.log("%c[HH-AR][VAC-DIAG] Requesting data from content script...", "color:#3b82f6;font-weight:bold");
    document.dispatchEvent(new CustomEvent("HH-AR-RUN-VAC-DIAG"));
    console.log("%c[HH-AR][VAC-DIAG] Wait 1 second, then run __hhVacDiag() again.", "color:#f59e0b;font-weight:bold");
    return null;
  }

  const d = window.__hhVacDiagData;

  console.log("%c[HH-AR][VAC-DIAG] === VACANCY PAGE DIAGNOSTIC ===", "color:#3b82f6;font-weight:bold;font-size:14px");
  console.log("URL:", d.url);
  console.log("Vacancy ID:", d.vacancyId);
  console.log("Timestamp:", d.timestamp);

  console.group("%c1. Known Selectors", "color:#3b82f6;font-weight:bold");
  Object.keys(d.selectors || {}).forEach(function (key) {
    const s = d.selectors[key];
    const icon = s.found ? "%c+" : "%cx";
    const color = s.found ? "color:#22c55e" : "color:#ef4444";
    console.log(icon + " " + key + "%c  " + (s.matchedSelector || "(none matched)"), color, "color:#71717a");
    if (s.found) {
      console.log("   tag=%s  data-qa=%s  text=%s", s.tag, s.dataQa, (s.text || "").substring(0, 80));
      if (s.items) console.log("   items (" + s.count + "):", s.items);
      if (s.htmlLength) console.log("   htmlLen=%d  textLen=%d", s.htmlLength, s.textLength);
    }
  });
  console.groupEnd();

  console.group("%c2. Auto-Detected Fields", "color:#3b82f6;font-weight:bold");
  const auto = d.autoDetect || {};
  ["title", "company", "salary", "location", "experience", "employment", "schedule"].forEach(function (field) {
    const f = auto[field];
    if (!f) return;
    const icon = f.value ? "%c+" : "%cx";
    const color = f.value ? "color:#22c55e" : "color:#ef4444";
    console.log(
      icon + " " + field + "%c  src=" + (f.source || "-") + "  value=" + (f.value || "(null)"),
      color,
      "color:#71717a",
    );
  });
  if (auto.keySkills && auto.keySkills.value) {
    console.log(
      "%c+ keySkills%c  src=" + auto.keySkills.source + "  count=" + auto.keySkills.count,
      "color:#22c55e",
      "color:#71717a",
    );
    console.log("   ", auto.keySkills.value);
  }
  if (auto.description && auto.description.found) {
    console.log(
      "%c+ description%c  src=" + auto.description.source + "  textLen=" + auto.description.textLength,
      "color:#22c55e",
      "color:#71717a",
    );
    console.log("   headings:", auto.description.headings);
    console.log("   snippet:", auto.description.textSnippet);
  }
  if (auto.brandedDescription && auto.brandedDescription.found) {
    console.log(
      "%c+ brandedDescription%c  textLen=" + auto.brandedDescription.textLength,
      "color:#22c55e",
      "color:#71717a",
    );
  }
  console.groupEnd();

  console.group("%c3. All data-qa Groups (" + (auto.dataQaCount || 0) + " prefixes)", "color:#3b82f6;font-weight:bold");
  if (auto.dataQaGroups) {
    Object.keys(auto.dataQaGroups)
      .sort()
      .forEach(function (prefix) {
        const items = auto.dataQaGroups[prefix];
        console.log(
          "  " + prefix + " (" + items.length + "):",
          items
            .map(function (i) {
              return i.qa;
            })
            .join(", "),
        );
      });
  }
  console.groupEnd();

  console.group(
    "%c4. Info Blocks (" + ((d.rawData || {}).infoBlocks || []).length + ")",
    "color:#3b82f6;font-weight:bold",
  );
  if (d.rawData && d.rawData.infoBlocks) {
    d.rawData.infoBlocks.forEach(function (b) {
      console.log("  %s  tag=%s  children=%d  text=%s", b.dataQa, b.tag, b.children, b.text.substring(0, 80));
    });
  }
  console.groupEnd();

  console.log("%c[HH-AR][VAC-DIAG] Full data: window.__hhVacDiagData", "color:#71717a");
  return d;
};
