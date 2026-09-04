/**
 * UI: PANEL -- SETTINGS TOGGLES
 * ==============================
 * Change handlers for settings controls: match mode select,
 * semantic opt-in and dry-run toggles. Persist to storage "settings"
 * and mirror into panelState. Extracted from events.js (AHG Rule 12).
 */

import { panelState } from "../state.js";

async function saveSetting(key, value) {
  const data = await chrome.storage.local.get("settings");
  const settings = data.settings || {};
  settings[key] = value;
  await chrome.storage.local.set({ settings });
  panelState.settings[key] = value;
}

/**
 * Bind settings control handlers inside the panel container.
 * @param {Element} container - panel root element
 */
export function bindSettingsToggles(container) {
  /* Match mode selector change */
  const matchModeSelect = container.querySelector("#s-match-mode");
  if (matchModeSelect) {
    matchModeSelect.addEventListener("change", async (e) => {
      const mode = e.target.value;
      await saveSetting("matchMode", mode);
      window.dispatchEvent(new CustomEvent("hh-ar-match-mode-changed", { detail: { mode } }));
    });
  }

  /* Semantic scoring opt-in toggle change (issue #9, default OFF) */
  const semanticOptInEl = container.querySelector("#s-semantic-optin");
  if (semanticOptInEl) {
    semanticOptInEl.addEventListener("change", async (e) => {
      await saveSetting("semanticOptIn", !!e.target.checked);
    });
  }

  /* Dry-run toggle change (issue #10, default OFF) */
  const dryRunEl = container.querySelector("#s-dry-run");
  if (dryRunEl) {
    dryRunEl.addEventListener("change", async (e) => {
      await saveSetting("dryRun", !!e.target.checked);
    });
  }
}
