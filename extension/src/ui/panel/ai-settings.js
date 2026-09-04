/**
 * UI: PANEL -- AI SETTINGS (F5.6)
 * =========================================
 * Loads AI config from background (ai-get-config) and populates the fields
 * in the Settings tab: provider, base URL, API key, model, etc.
 * On input -- debounced save via ai-set-config. Never throws.
 *
 * Supports 3 providers: Z.ai (cloud), Ollama (local), Custom (OpenAI-compatible).
 * Provider switching and model fetch delegated to ai-settings-handlers.js.
 *
 * v1.9.78.0
 */

import { PROVIDER_DEFAULTS } from "../../services/ai-providers.js";
import { refs } from "../state.js";
import { bindModelFetchHandler, bindProviderHandler, toggleZaiFields } from "./ai-settings-handlers.js";

const DEBOUNCE_MS = 500;
const AI_FIELD_IDS = [
  "s-ai-provider",
  "s-ai-base-url",
  "s-ai-api-key",
  "s-ai-token",
  "s-ai-chat-id",
  "s-ai-user-id",
  "s-ai-model",
  "s-ai-timeout",
];

async function sendBg(msg, msgImpl) {
  const sender = msgImpl || (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage);
  if (typeof sender !== "function") {
    return { ok: false, error: "chrome.runtime.sendMessage unavailable", code: "NO_BG" };
  }
  return new Promise((resolve) => {
    try {
      sender(msg, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message, code: "BG_ERR" });
        } else {
          resolve(resp || { ok: false, error: "No response", code: "EMPTY_RESP" });
        }
      });
    } catch (e) {
      resolve({ ok: false, error: e.message || String(e), code: "BG_THROW" });
    }
  });
}

export async function loadAiConfig(msgImpl) {
  const result = await sendBg({ type: "ai-get-config" }, msgImpl);
  if (!result || result.ok === false) {
    return {
      ok: false,
      error: (result && result.error) || "BG returned no data",
      code: (result && result.code) || "EMPTY_RESP",
    };
  }
  const cfg = result.config || (result.baseUrl !== undefined ? result : null);
  if (!cfg) {
    return { ok: false, error: "BG returned no config", code: "EMPTY_RESP" };
  }
  return {
    ok: true,
    config: {
      provider: cfg.provider || "zai",
      baseUrl: cfg.baseUrl || PROVIDER_DEFAULTS.zai.baseUrl,
      apiKey: cfg.apiKey || "",
      token: cfg.token || "",
      chatId: cfg.chatId || "",
      userId: cfg.userId || "",
      model: cfg.model || PROVIDER_DEFAULTS.zai.model,
      timeoutMs: cfg.timeoutMs || 60000,
    },
  };
}

export async function saveAiConfig(partial, msgImpl) {
  if (!partial || typeof partial !== "object") {
    return { ok: false, error: "partial must be an object", code: "BAD_INPUT" };
  }
  const result = await sendBg({ type: "ai-set-config", config: partial }, msgImpl);
  if (!result || result.ok === false) {
    return {
      ok: false,
      error: (result && result.error) || "BG save failed",
      code: (result && result.code) || "EMPTY_RESP",
    };
  }
  return { ok: true };
}

export async function populateAiFields(msgImpl) {
  const sr = refs.shadowRoot;
  if (!sr) return false;

  const result = await loadAiConfig(msgImpl);
  if (!result.ok) {
    setFieldValue(sr, "s-ai-provider", "zai");
    setFieldValue(sr, "s-ai-base-url", PROVIDER_DEFAULTS.zai.baseUrl);
    setFieldValue(sr, "s-ai-api-key", "");
    setFieldValue(sr, "s-ai-token", "");
    setFieldValue(sr, "s-ai-chat-id", "");
    setFieldValue(sr, "s-ai-user-id", "");
    setFieldValue(sr, "s-ai-model", PROVIDER_DEFAULTS.zai.model);
    setFieldValue(sr, "s-ai-timeout", "60000");
    toggleZaiFields(sr, "zai");
    return false;
  }

  setFieldValue(sr, "s-ai-provider", result.config.provider);
  setFieldValue(sr, "s-ai-base-url", result.config.baseUrl);
  setFieldValue(sr, "s-ai-api-key", result.config.apiKey);
  setFieldValue(sr, "s-ai-token", result.config.token);
  setFieldValue(sr, "s-ai-chat-id", result.config.chatId);
  setFieldValue(sr, "s-ai-user-id", result.config.userId);
  setFieldValue(sr, "s-ai-model", result.config.model);
  setFieldValue(sr, "s-ai-timeout", String(result.config.timeoutMs || 60000));
  toggleZaiFields(sr, result.config.provider);
  return true;
}

function setFieldValue(sr, id, value) {
  const el = sr.getElementById(id);
  if (el) el.value = value || "";
}

function getFieldValue(sr, id) {
  const el = sr.getElementById(id);
  return el ? el.value || "" : "";
}

export function readAiFields() {
  const sr = refs.shadowRoot;
  if (!sr)
    return { provider: "zai", baseUrl: "", apiKey: "", token: "", chatId: "", userId: "", model: "", timeoutMs: 60000 };
  const timeoutStr = getFieldValue(sr, "s-ai-timeout");
  const timeoutMs = Number(timeoutStr);
  return {
    provider: getFieldValue(sr, "s-ai-provider") || "zai",
    baseUrl: getFieldValue(sr, "s-ai-base-url"),
    apiKey: getFieldValue(sr, "s-ai-api-key"),
    token: getFieldValue(sr, "s-ai-token"),
    chatId: getFieldValue(sr, "s-ai-chat-id"),
    userId: getFieldValue(sr, "s-ai-user-id"),
    model: getFieldValue(sr, "s-ai-model"),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 60000,
  };
}

export function bindAiSettingsHandlers(container, opts) {
  if (!container) return;
  const msgImpl = opts && opts.msgImpl;
  const debounceMs = (opts && opts.debounceMs) || DEBOUNCE_MS;
  const timers = new Map();

  const fieldMap = {
    "s-ai-provider": "provider",
    "s-ai-base-url": "baseUrl",
    "s-ai-api-key": "apiKey",
    "s-ai-token": "token",
    "s-ai-chat-id": "chatId",
    "s-ai-user-id": "userId",
    "s-ai-model": "model",
    "s-ai-timeout": "timeoutMs",
  };

  bindProviderHandler(container, readAiFields, saveAiConfig, msgImpl);
  bindModelFetchHandler(container, sendBg, setFieldValue, saveAiConfig, msgImpl);

  for (const id of AI_FIELD_IDS) {
    if (id === "s-ai-provider") continue;
    const el = container.querySelector("#" + id);
    if (!el) continue;
    el.addEventListener("input", () => {
      if (timers.has(id)) clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          const cfg = readAiFields();
          const partial = { [fieldMap[id]]: cfg[fieldMap[id]] };
          saveAiConfig(partial, msgImpl).catch(() => {});
        }, debounceMs),
      );
    });
  }
}

export const _internal = {
  AI_FIELD_IDS,
  DEBOUNCE_MS,
  sendBg,
  setFieldValue,
  getFieldValue,
};
