/**
 * UI: PANEL -- AI SETTINGS HANDLERS
 * ==================================
 * Provider change and model fetch button handlers for AI settings.
 * Extracted from ai-settings.js for AHG Rule 12 (250-line hard cap).
 *
 * v1.9.78.0
 */

import { PROVIDER_DEFAULTS } from "../../services/ai-providers.js";
import { refs } from "../state.js";

function setFieldValue(sr, id, value) {
  const el = sr.getElementById(id);
  if (el) el.value = value || "";
}

function getFieldValue(sr, id) {
  const el = sr.getElementById(id);
  return el ? el.value || "" : "";
}

/** Show/hide Z.ai-specific fields based on provider. */
export function toggleZaiFields(sr, provider) {
  const zaiBlock = sr.getElementById("s-ai-zai-fields");
  if (zaiBlock) zaiBlock.style.display = provider === "zai" ? "" : "none";
}

/**
 * Bind provider change handler: auto-fill URL, toggle Z.ai fields.
 */
export function bindProviderHandler(container, readAiFields, saveAiConfig, msgImpl) {
  const providerEl = container.querySelector("#s-ai-provider");
  if (!providerEl) return;
  providerEl.addEventListener("change", () => {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const provider = providerEl.value;
    const defs = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.zai;
    toggleZaiFields(sr, provider);
    setFieldValue(sr, "s-ai-base-url", defs.baseUrl);
    const baseUrlEl = sr.getElementById("s-ai-base-url");
    if (baseUrlEl) baseUrlEl.readOnly = provider === "openrouter";
    setFieldValue(sr, "s-ai-api-key", defs.apiKey);
    setFieldValue(sr, "s-ai-model", defs.model);
    if (provider !== "zai") {
      setFieldValue(sr, "s-ai-token", "");
      setFieldValue(sr, "s-ai-chat-id", "");
      setFieldValue(sr, "s-ai-user-id", "");
    }
    const cfg = readAiFields();
    saveAiConfig(cfg, msgImpl).catch(() => {});
  });
}

/**
 * Bind model fetch button (Ollama / OpenRouter) click handler.
 */
export function bindModelFetchHandler(container, sendBg, setFieldValue_, saveAiConfig, msgImpl) {
  const fetchBtn = container.querySelector("#s-ai-fetch-models");
  if (!fetchBtn) return;
  fetchBtn.addEventListener("click", async () => {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const listEl = sr.getElementById("s-ai-model-list");
    const baseUrl = getFieldValue(sr, "s-ai-base-url");
    const provider = getFieldValue(sr, "s-ai-provider");
    const isOpenRouter = provider === "openrouter";
    const msgType = isOpenRouter ? "ai-fetch-openrouter-models" : "ai-fetch-ollama-models";
    const emptyText = isOpenRouter
      ? "Модели не получены. Проверь ключ/подключение."
      : "Модели не найдены. Проверь, что Ollama запущен.";
    const errorText = isOpenRouter ? "Модели не получены. Проверь ключ/подключение." : "Ошибка подключения к Ollama.";
    fetchBtn.disabled = true;
    fetchBtn.textContent = "...";
    try {
      const result = await sendBg({ type: msgType, baseUrl }, msgImpl);
      if (result && result.models && result.models.length > 0) {
        listEl.innerHTML = "";
        for (const m of result.models) {
          const tag = document.createElement("span");
          tag.className = "ai-model-tag";
          tag.style.cssText =
            "display:inline-block;padding:2px 6px;margin:2px;border:1px solid #e4e4e7;border-radius:4px;font-size:10px;cursor:pointer;";
          tag.textContent = m;
          tag.dataset.model = m;
          tag.addEventListener("click", () => {
            setFieldValue_(sr, "s-ai-model", tag.dataset.model);
            saveAiConfig({ model: tag.dataset.model }, msgImpl).catch(() => {});
          });
          listEl.appendChild(tag);
        }
      } else {
        listEl.textContent = emptyText;
      }
    } catch (_e) {
      listEl.textContent = errorText;
    }
    fetchBtn.disabled = false;
    fetchBtn.textContent = "Загрузить";
  });
}
