/**
 * UI: CAPTCHA NOTIFICATIONS
 * ==========================
 * Handles CAPTCHA notification banner in the sidebar.
 * Split from panel/index.js to keep file size under AHG Rule 12 (250 lines).
 */

import { resumeFromCaptcha } from "../../lib/captcha-detector.js";

/**
 * Show CAPTCHA notification banner in the sidebar.
 * @param {Object} refs - panel refs object
 * @param {Function} log - logger function
 * @param {string} type - CAPTCHA type (e.g., 'recaptcha', 'image')
 * @param {boolean} paused - whether extension is auto-paused
 */
export function showCaptchaNotification(refs, log, type, paused) {
  if (!refs.shadowRoot) return;
  let banner = refs.shadowRoot.getElementById("captcha-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "captcha-banner";
    banner.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:1000000;background:#FEF3C7;border-bottom:1px solid #F59E0B;padding:8px 12px;font-size:12px;color:#92400E;display:flex;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);";
    const panel = refs.shadowRoot.querySelector(".fab-panel");
    if (panel) panel.prepend(banner);
  }
  banner.innerHTML = `
    <span>[!] CAPTCHA обнаружена (${type}) -- ${paused ? "автопауза активна" : "автопауза отключена в настройках"}</span>
    <button data-action="captcha-resume" style="background:#F59E0B;color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;">Продолжить работу</button>
  `;
  banner.style.display = "flex";

  // Bind resume button
  const resumeBtn = banner.querySelector('[data-action="captcha-resume"]');
  if (resumeBtn) {
    resumeBtn.onclick = async () => {
      await resumeFromCaptcha();
      hideCaptchaNotification(refs);
      window.dispatchEvent(new CustomEvent("hh-ar-captcha-resume"));
    };
  }
}

/**
 * Hide CAPTCHA notification banner.
 * @param {Object} refs - panel refs object
 */
export function hideCaptchaNotification(refs) {
  if (!refs.shadowRoot) return;
  const banner = refs.shadowRoot.getElementById("captcha-banner");
  if (banner) banner.style.display = "none";
}
