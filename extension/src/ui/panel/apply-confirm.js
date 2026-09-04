/**
 * UI: PANEL -- APPLY CONFIRM DIALOG (#10, portion B)
 * ==================================================
 * Batch-apply confirmation rendered in Shadow DOM.
 * confirmApplyAll() resolves true on [Откликнуться], false on [Отмена]/missing UI.
 */

import { refs } from "../state.js";

/**
 * Show mass-apply confirmation dialog.
 * @param {{count: number, minScore: number, skipped: number}} preview
 * @returns {Promise<boolean>} true when user confirms
 */
export function confirmApplyAll(preview) {
  const sr = refs.shadowRoot;
  if (!sr) return Promise.resolve(false);

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.id = "hh-ar-apply-confirm";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);";

    const card = document.createElement("div");
    card.style.cssText =
      "background:#fff;border-radius:12px;padding:20px;max-width:360px;margin:16px;font-size:13px;color:#18181b;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:14px;font-weight:600;margin-bottom:8px;";
    title.textContent = "Откликнуться на " + preview.count + " вакансий?";

    const hint = document.createElement("div");
    hint.style.cssText = "font-size:12px;color:#52525b;margin-bottom:16px;line-height:1.5;";
    hint.textContent =
      "score >= " + preview.minScore + ". Ранее пропущено: " + preview.skipped + ". Очередь можно остановить паузой.";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.textContent = "Откликнуться";
    okBtn.style.cssText =
      "padding:8px 14px;border:none;border-radius:8px;background:#2964FF;color:#fff;font-size:12px;cursor:pointer;";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Отмена";
    cancelBtn.style.cssText =
      "padding:8px 14px;border:1px solid #e4e4e7;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;";

    const done = (value) => {
      overlay.remove();
      resolve(value);
    };
    okBtn.addEventListener("click", () => done(true));
    cancelBtn.addEventListener("click", () => done(false));

    row.appendChild(cancelBtn);
    row.appendChild(okBtn);
    card.appendChild(title);
    card.appendChild(hint);
    card.appendChild(row);
    overlay.appendChild(card);
    sr.appendChild(overlay);
  });
}
