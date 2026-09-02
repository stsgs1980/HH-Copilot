/**
 * MAIN: BOOT SEQUENCE
 * =====================
 * Entry point for the bundled content script.
 * Thin orchestrator -- delegates to focused modules:
 *   - main-page-handlers.js -- URL-based page initialization
 *   - main-resume-loader.js -- hh-ar-load-resume event handler
 *   - main-sync.js          -- hh-ar-sync-resumes event handler
 *   - main-listeners.js     -- vacancy diag + page logic + re-score
 *
 * Auth flow:
 *   init() -> createPanel() -> updateAuthState every 5s
 *   When auth changes to true -> initPageLogic() starts page parsers
 *   When auth changes to false -> panel shows "Log in to hh.ru"
 */

import { createLogger } from "../lib/anti-hallucination.js";
import { checkDailyReset, getAllSettings, getStats } from "../lib/storage.js";
import { debugVisibility, diagnoseResumeDOM } from "../parsers/resume-detail.js";
import { parseVacanciesFromPage } from "../parsers/vacancy-list.js";
import { createPanel, panelState, updateVacancies } from "../ui/panel.js";
import { updateSettings, updateStats } from "../ui/state.js";

// Split modules
import { checkAndPause, loadCaptchaState } from "../lib/captcha-detector.js";
import { isInspectorActive, toggleInspector as toggleDomInspector } from "../ui/dom-inspector.js";
import { setFabInspectorActive } from "../ui/fab.js";
import { setupAllPageListeners } from "./main-listeners.js";
import { initPageLogic } from "./main-page-handlers.js";
import { loadSavedResumes } from "./main-resume-boot.js";
import { handleLoadResume, handleReparseResume } from "./main-resume-loader.js";
import { handleSyncResumes } from "./main-sync.js";

// Re-export for dynamic import from panel (ui/panel/index.js)
export { initPageLogic };

const mainLog = createLogger("Main");

// Expose diagnostic functions globally for console access
// NOTE: Content scripts run in an isolated world -- window.X set here is NOT
// visible from the page's console. Console helpers (__hhVis, __hhVisTable)
// are now provided by page-world.js (Manifest V3 "world": "MAIN" script).
window.__hhDiagnose = diagnoseResumeDOM;
window.__hhDebugVisibility = debugVisibility;

// Initialize visibility diagnostic dump (will be populated after sync)
window.__hhVisDiag = null;

// ===============================================
// INIT
// ===============================================

async function init() {
  mainLog.info("Loaded: " + window.location.href);
  await checkDailyReset();

  // Load stats + settings into panelState at boot
  try {
    const [stats, settings] = await Promise.all([getStats(), getAllSettings()]);
    updateStats(stats);
    updateSettings(settings);
    mainLog.info("Boot: stats + settings loaded from storage");
  } catch (_e) {
    mainLog.warn("Boot: failed to load stats/settings: " + _e.message);
  }

  // F4.4: load persisted CAPTCHA pause state (survives page reloads)
  await loadCaptchaState();

  createPanel();

  // F4.4: check current page for CAPTCHA (auto-pause if found)
  try {
    const settings = panelState.settings || {};
    const captchaRes = await checkAndPause(document, settings);
    if (captchaRes.found) {
      mainLog.warn("CAPTCHA detected on page load: " + captchaRes.type);
      // Notify panel to show banner
      window.dispatchEvent(
        new CustomEvent("hh-ar-captcha-detected", {
          detail: { type: captchaRes.type, found: true, paused: captchaRes.paused },
        }),
      );
      // Update extension badge to signal pause
      if (chrome.action && chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#D97706" });
      }
    }
  } catch (_e) {
    /* ignore */
  }

  // Load saved resumes from storage + migrate old data
  await loadSavedResumes();

  // Auth state is managed by createPanel's periodic updateAuthState (every 5s)
  // When auth changes to true, updateAuthState calls initPageLogic

  // -- Event listeners --
  window.addEventListener("hh-ar-apply", async (e) => {
    if (!panelState.isLoggedIn) return;
    const { applyToVacancy } = await import("../engine/index.js");
    await applyToVacancy(e.detail.vacancyId, panelState.resume);
  });

  window.addEventListener("hh-ar-apply-all", async () => {
    if (!panelState.isLoggedIn) return;
    const { applyToAll } = await import("../engine/index.js");
    await applyToAll(panelState.vacancies, undefined, panelState.resume);
  });

  window.addEventListener("hh-ar-refresh", async () => {
    if (!panelState.isLoggedIn) return;
    const v = await parseVacanciesFromPage(panelState.resume);
    updateVacancies(v);
  });

  window.addEventListener("hh-ar-load-resume", handleLoadResume);
  window.addEventListener("hh-ar-reparse-resume", handleReparseResume);
  window.addEventListener("hh-ar-sync-resumes", handleSyncResumes);

  setupAllPageListeners();
}

// ===============================================
// Message listener (from popup / background)
// ===============================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "toggle-inspector") {
    toggleDomInspector();
    setFabInspectorActive(isInspectorActive());
    sendResponse({ active: isInspectorActive() });
  }
});

// ===============================================
// Hot-Module Replacement (HMR) -- dev-only
// ===============================================
// In unpacked (dev) mode, connects to the WebSocket server started
// by esbuild.config.mjs. When a file changes, esbuild rebuilds ->
// server sends "reload" -> extension calls chrome.runtime.reload().
//
// Activates ONLY when 'update_url' is absent from manifest
// (i.e. unpacked dev extension, not Chrome Web Store).
// Zero overhead in production.
// ===============================================

if (!("update_url" in chrome.runtime.getManifest())) {
  try {
    const hmr = new WebSocket("ws://localhost:35729");
    hmr.onmessage = (e) => {
      if (e.data === "reload") {
        mainLog.info("[hmr] Reload signal received -- reloading extension");
        chrome.runtime.reload();
      }
    };
    hmr.onopen = () => mainLog.info("[hmr] Connected to dev server");
    hmr.onerror = () => {}; // server not running -- that's fine
    hmr.onclose = () => mainLog.info("[hmr] Disconnected from dev server");
  } catch (_e) {
    // WebSocket not available -- ignore
  }
}

// BOOT
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
