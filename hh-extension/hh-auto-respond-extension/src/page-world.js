/**
 * PAGE WORLD SCRIPT — runs in the page's MAIN world (not isolated).
 * This file is injected as a content script with "world": "MAIN" in manifest.json.
 *
 * Purpose: Expose __hhVis() / __hhVisTable() / __hhVisDiag to the browser console
 * so the user can inspect visibility diagnostic data after syncing resumes.
 *
 * Communication: Content script (isolated world) sends data via window.postMessage
 * with { type: 'HH-AR-VISDIAG', payload: ... }. This script listens and stores it.
 */

// Initialize
window.__hhVisDiag = null;

window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== 'HH-AR-VISDIAG') return;

  window.__hhVisDiag = event.data.payload;
  console.log('%c[HH-AR][VIS-DIAG] Data updated — use __hhVis() or __hhVisTable()', 'color:#22c55e;font-weight:bold');
});

/**
 * Console helper: print a formatted visibility diagnostic report.
 * Usage: __hhVis() — after running "Синхронизировать все" in the panel.
 */
window.__hhVis = function() {
  var d = window.__hhVisDiag;
  if (!d) {
    console.log('%c[HH-AR][VIS-DIAG] No sync data yet. Run "Синхронизировать все" first.', 'color:#f59e0b;font-weight:bold');
    return;
  }

  console.log('%c[HH-AR][VIS-DIAG] ═══ VISIBILITY DIAGNOSTIC DUMP ═══', 'color:#2964FF;font-weight:bold;font-size:14px');
  console.log('Started:', d.startedAt);
  console.log('Finished:', d.finishedAt);
  console.log('List source:', d.listSource, '| HTML length:', d.listRawHtmlLength);
  console.log('%cSummary:', 'font-weight:bold', d.summary);

  if (d.error) {
    console.log('%cFATAL ERROR: ' + d.error, 'color:#ef4444;font-weight:bold');
  }

  console.group('%cPer-resume details:', 'color:#2964FF;font-weight:bold');
  (d.resumes || []).forEach(function(r) {
    var color = r.finalVisibility === 'visible' ? '#22c55e' : r.finalVisibility === 'hidden' ? '#ef4444' : '#f59e0b';
    console.log('%c  ' + (r.id ? r.id.substring(0, 8) : '?') + ' "' + (r.title || '').substring(0, 40) + '" → %c' + r.finalVisibility, 'font-weight:bold', 'color:' + color + ';font-weight:bold');
    console.log('    list: ' + r.listVis + ' | page: ' + r.pageVis + ' | iframe: ' + (r.iframeVis || '-') + ' | reason: ' + r.decisionReason);
    if (r.pageTrace && r.pageTrace.length > 0) {
      console.log('    trace:', r.pageTrace.join(' → '));
    }
    // Show iframe diagnostic data if available
    if (r.iframeDiag) {
      console.log('    iframe URL:', r.iframeDiag.finalUrl);
      console.log('    iframe title:', r.iframeDiag.title);
      console.log('    iframe bodyLen:', r.iframeDiag.bodyTextLen);
      console.log('    iframe bodySnippet:', r.iframeDiag.bodyTextSnippet ? r.iframeDiag.bodyTextSnippet.substring(0, 300) : '(empty)');
      if (r.iframeDiag.dataQaList && r.iframeDiag.dataQaList.length > 0) {
        console.log('    iframe dataQa (' + r.iframeDiag.dataQaList.length + '):', r.iframeDiag.dataQaList.slice(0, 15));
      }
      if (r.iframeDiag.actionTexts && r.iframeDiag.actionTexts.length > 0) {
        console.log('    iframe actions:', r.iframeDiag.actionTexts);
      }
    }
  });
  console.groupEnd();

  console.log('%c[HH-AR][VIS-DIAG] Full data: window.__hhVisDiag', 'color:#71717a');
  console.log('%c[HH-AR][VIS-DIAG] Quick table: window.__hhVisTable()', 'color:#71717a');
  return d;
};

/**
 * Console helper: print a compact table of all resume visibility.
 */
window.__hhVisTable = function() {
  var d = window.__hhVisDiag;
  if (!d) {
    console.log('%c[HH-AR][VIS-DIAG] No sync data yet. Run "Синхронизировать все" first.', 'color:#f59e0b;font-weight:bold');
    return;
  }
  console.table((d.resumes || []).map(function(r) {
    return {
      id: r.id ? r.id.substring(0, 12) : '?',
      title: (r.title || '').substring(0, 35),
      listVis: r.listVis,
      pageVis: r.pageVis,
      iframeVis: r.iframeVis || '-',
      final: r.finalVisibility,
      reason: (r.decisionReason || '').substring(0, 60)
    };
  }));
  return d.resumes;
};

// ═══════════════════════════════════════════════
// VACANCY PAGE DIAGNOSTIC
// ═══════════════════════════════════════════════

window.__hhVacDiagData = null;

window.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'HH-AR-VAC-DIAG') return;

  window.__hhVacDiagData = event.data.payload;
  console.log('%c[HH-AR][VAC-DIAG] Data updated — use __hhVacDiag()', 'color:#3b82f6;font-weight:bold');
});

/**
 * Console helper: print a formatted vacancy page diagnostic.
 * Usage: Open any /vacancy/{id} page, then type __hhVacDiag() in console.
 */
window.__hhVacDiag = function() {
  // If no data yet, request it from content script via DOM event
  if (!window.__hhVacDiagData) {
    console.log('%c[HH-AR][VAC-DIAG] Requesting data from content script...', 'color:#3b82f6;font-weight:bold');
    document.dispatchEvent(new CustomEvent('HH-AR-RUN-VAC-DIAG'));
    console.log('%c[HH-AR][VAC-DIAG] Wait 1 second, then run __hhVacDiag() again.', 'color:#f59e0b;font-weight:bold');
    return null;
  }

  var d = window.__hhVacDiagData;

  console.log('%c[HH-AR][VAC-DIAG] ═══ VACANCY PAGE DIAGNOSTIC ═══', 'color:#3b82f6;font-weight:bold;font-size:14px');
  console.log('URL:', d.url);
  console.log('Vacancy ID:', d.vacancyId);
  console.log('Timestamp:', d.timestamp);

  // ── Known selectors ──
  console.group('%c1. Known Selectors', 'color:#3b82f6;font-weight:bold');
  Object.keys(d.selectors || {}).forEach(function(key) {
    var s = d.selectors[key];
    var icon = s.found ? '%c✓' : '%c✗';
    var color = s.found ? 'color:#22c55e' : 'color:#ef4444';
    console.log(icon + ' ' + key + '%c  ' + (s.matchedSelector || '(none matched)'), color, 'color:#71717a');
    if (s.found) {
      console.log('   tag=%s  data-qa=%s  text=%s', s.tag, s.dataQa, (s.text || '').substring(0, 80));
      if (s.items) console.log('   items (' + s.count + '):', s.items);
      if (s.htmlLength) console.log('   htmlLen=%d  textLen=%d', s.htmlLength, s.textLength);
    }
  });
  console.groupEnd();

  // ── Auto-detected fields ──
  console.group('%c2. Auto-Detected Fields', 'color:#3b82f6;font-weight:bold');
  var auto = d.autoDetect || {};
  ['title', 'company', 'salary', 'location', 'experience', 'employment', 'schedule'].forEach(function(field) {
    var f = auto[field];
    if (!f) return;
    var icon = f.value ? '%c✓' : '%c✗';
    var color = f.value ? 'color:#22c55e' : 'color:#ef4444';
    console.log(icon + ' ' + field + '%c  src=' + (f.source || '-') + '  value=' + (f.value || '(null)'), color, 'color:#71717a');
  });
  if (auto.keySkills && auto.keySkills.value) {
    console.log('%c✓ keySkills%c  src=' + auto.keySkills.source + '  count=' + auto.keySkills.count, 'color:#22c55e', 'color:#71717a');
    console.log('   ', auto.keySkills.value);
  }
  if (auto.description && auto.description.found) {
    console.log('%c✓ description%c  src=' + auto.description.source + '  textLen=' + auto.description.textLength, 'color:#22c55e', 'color:#71717a');
    console.log('   headings:', auto.description.headings);
    console.log('   snippet:', auto.description.textSnippet);
  }
  if (auto.brandedDescription && auto.brandedDescription.found) {
    console.log('%c✓ brandedDescription%c  textLen=' + auto.brandedDescription.textLength, 'color:#22c55e', 'color:#71717a');
  }
  console.groupEnd();

  // ── All data-qa groups ──
  console.group('%c3. All data-qa Groups (' + (auto.dataQaCount || 0) + ' prefixes)', 'color:#3b82f6;font-weight:bold');
  if (auto.dataQaGroups) {
    Object.keys(auto.dataQaGroups).sort().forEach(function(prefix) {
      var items = auto.dataQaGroups[prefix];
      console.log('  ' + prefix + ' (' + items.length + '):', items.map(function(i) { return i.qa; }).join(', '));
    });
  }
  console.groupEnd();

  // ── Info blocks ──
  console.group('%c4. Info Blocks (' + ((d.rawData || {}).infoBlocks || []).length + ')', 'color:#3b82f6;font-weight:bold');
  if (d.rawData && d.rawData.infoBlocks) {
    d.rawData.infoBlocks.forEach(function(b) {
      console.log('  %s  tag=%s  children=%d  text=%s', b.dataQa, b.tag, b.children, b.text.substring(0, 80));
    });
  }
  console.groupEnd();

  console.log('%c[HH-AR][VAC-DIAG] Full data: window.__hhVacDiagData', 'color:#71717a');
  return d;
};

console.log('%c[HH-AR][VIS-DIAG] Console helpers ready: __hhVis() / __hhVisTable() / __hhVacDiag()', 'color:#71717a;font-size:11px');

// ═══════════════════════════════════════════════
// SPA NAVIGATION — pushState patch for content script communication
// ═══════════════════════════════════════════════
//
// Problem: Content script runs in isolated world and can't intercept
// pushState/replaceState calls made by hh.ru's own JavaScript.
// Solution: Patch pushState in MAIN world and dispatch a CustomEvent
// that the content script can listen to.
//
// NOTE: We do NOT intercept link clicks here. hh.ru has its own SPA router
// that handles in-page navigation via pushState. Our click interception was
// breaking navigation because pushState alone doesn't trigger hh.ru's router
// to load new page content — it only changes the URL bar.

(function setupSPANavigation() {
  // ── 1. Patch pushState & replaceState ──
  var origPush = history.pushState;
  history.pushState = function() {
    origPush.apply(this, arguments);
    document.dispatchEvent(new CustomEvent('hh-ar-spa-navigate', {
      detail: { path: window.location.pathname, source: 'pushState' }
    }));
  };

  var origReplace = history.replaceState;
  history.replaceState = function() {
    origReplace.apply(this, arguments);
    document.dispatchEvent(new CustomEvent('hh-ar-spa-navigate', {
      detail: { path: window.location.pathname, source: 'replaceState' }
    }));
  };

  console.log('%c[HH-AR][SPA] pushState/replaceState patches active', 'color:#71717a;font-size:11px');
})();
