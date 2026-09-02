/**
 * UI: TABS -- NEGOTIATIONS AI REPLY (F4.3)
 * =========================================
 * Renders the AI reply panel inside the negotiations chat area:
 *   - Tone selector (formal/friendly/concise/enthusiastic)
 *   - "Generate 3 variants" button
 *   - 3 variant cards with click-to-insert
 *   - Loading + error states
 *   - Typing simulation on insert (F3.3)
 *
 * v1.9.45.0
 */

import { simulateTyping } from "../../lib/timing.js";
import { esc } from "../html.js";
import { panelState, refs } from "../state.js";
import { requestAiReply } from "./negotiations-ai-service.js";

export { requestAiReply };

const TONES = [
  { id: "formal", label: "Формальный" },
  { id: "friendly", label: "Дружелюбный" },
  { id: "concise", label: "Краткий" },
  { id: "enthusiastic", label: "Энтузиаст" },
];

let aiState = {
  loading: false,
  error: null,
  variants: [],
  tone: "formal",
};

/**
 * Insert a variant into the chat input with typing simulation.
 * @param {string} text
 * @param {Object} [opts] -- { speedMs, useSimulation }
 * @returns {Promise<boolean>}
 */
export async function insertVariant(text, opts) {
  const sr = refs.shadowRoot;
  const input = sr?.getElementById("neg-chat-input");
  if (!input || !text) return false;

  const useSim = opts && opts.useSimulation !== undefined ? opts.useSimulation : true;
  const speed = (opts && opts.speedMs) || 80;

  if (!useSim) {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  return simulateTyping(input, text, { baseDelay: Math.max(15, speed / 4), jitter: speed });
}

/** Set the tone and re-render. */
export function setAiTone(tone) {
  if (!TONES.find((t) => t.id === tone)) return;
  aiState.tone = tone;
  renderAiReplyArea();
}

/** State setter for tests. */
export function _setAiState(next) {
  aiState = { ...aiState, ...next };
}

/** State getter for tests. */
export function _getAiState() {
  return { ...aiState };
}

/**
 * Render the AI reply panel inside the chat area.
 * Called from renderChatMessages() in tabs/negotiations.js.
 */
export function renderAiReplyArea() {
  const sr = refs.shadowRoot;
  const container = sr?.getElementById("neg-ai-reply-area");
  if (!container) return;

  const conv = panelState.negotiations.find((c) => c.id === panelState.activeConversation);
  if (!conv) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "";

  const toneOptions = TONES.map(
    (t) => `<option value="${t.id}"${t.id === aiState.tone ? " selected" : ""}>${esc(t.label)}</option>`,
  ).join("");

  const toneSelect =
    '<select id="neg-ai-tone" class="input" style="font-size:11px;padding:4px 8px;border:1px solid #e4e4e7;border-radius:6px;">' +
    toneOptions +
    "</select>";

  const genBtn =
    '<button id="neg-ai-generate" class="btn btn-outline btn-sm" ' +
    'style="font-size:11px;padding:4px 10px;cursor:pointer;" ' +
    (aiState.loading ? "disabled" : "") +
    ">" +
    (aiState.loading ? "Генерация..." : "AI: 3 варианта") +
    "</button>";

  const errorBlock = aiState.error
    ? '<div style="font-size:10px;color:#DC2626;margin-top:6px;padding:4px 6px;background:#FEF2F2;border-radius:4px;">' +
      "[ERR] " +
      esc(aiState.error) +
      "</div>"
    : "";

  const variantsHtml = (aiState.variants || [])
    .map((v, i) => {
      const num = i + 1;
      return (
        '<div class="ai-variant-card" data-variant-idx="' +
        i +
        '" ' +
        'style="border:1px solid #e4e4e7;border-radius:8px;padding:8px 10px;margin-top:6px;cursor:pointer;background:#FAFAFA;">' +
        '<div style="font-size:10px;color:#52525b;margin-bottom:4px;">Вариант ' +
        num +
        " (клик для вставки)</div>" +
        '<div style="font-size:11px;line-height:1.5;white-space:pre-wrap;">' +
        esc(v) +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);">' +
    '<span style="font-size:11px;font-weight:500;">AI-ответ:</span>' +
    toneSelect +
    genBtn +
    "</div>" +
    errorBlock +
    variantsHtml;
}

/**
 * Click handler for the AI reply area (delegated).
 * Call from panel/events.js on container click.
 * @param {Event} e
 */
export async function handleAiReplyClick(e) {
  const genBtn = e.target.closest && e.target.closest("#neg-ai-generate");
  if (genBtn && !aiState.loading) {
    aiState.loading = true;
    aiState.error = null;
    aiState.variants = [];
    renderAiReplyArea();
    try {
      const conv = panelState.negotiations.find((c) => c.id === panelState.activeConversation);
      const result = await requestAiReply(conv, aiState.tone);
      if (result.ok) {
        aiState.variants = result.variants;
      } else {
        aiState.error = result.error || result.code || "Unknown error";
      }
    } catch (err) {
      aiState.error = err.message || String(err);
    } finally {
      aiState.loading = false;
      renderAiReplyArea();
    }
    return;
  }

  const card = e.target.closest && e.target.closest(".ai-variant-card");
  if (card) {
    const idx = parseInt(card.dataset.variantIdx, 10);
    const text = aiState.variants[idx];
    if (text) {
      const sr = refs.shadowRoot;
      const emulate = sr?.getElementById("neg-type-emulation");
      const speedEl = sr?.getElementById("neg-type-speed");
      const useSim = emulate ? emulate.checked : true;
      const speed = speedEl ? parseInt(speedEl.value, 10) || 80 : 80;
      await insertVariant(text, { useSimulation: useSim, speedMs: speed });
    }
  }
}
