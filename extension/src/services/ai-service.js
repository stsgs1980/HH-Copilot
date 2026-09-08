/**
 * SERVICES: AI SERVICE (F4.2)
 * =========================================
 * Thin fetch-based client for chat completions API.
 * Supports providers: OpenCode Zen (free models) and custom OpenAI-compatible.
 *
 * Provider detection delegated to ai-providers.js.
 *
 * Anti-hallucination: NEVER throws; always returns { ok:false, error, code }.
 *   EMPTY / NETWORK / TIMEOUT / HTTP_<status> / RATE_LIMIT / NO_API_KEY / BAD_JSON
 *
 * v1.9.87.0
 */

import { createLogger } from "../lib/anti-hallucination.js";
import {
  PROVIDER_CUSTOM,
  PROVIDER_ZEN,
  ZEN_BASE_URL,
  ZEN_DEFAULT_MODEL,
  detectProvider,
  fetchZenModels,
} from "./ai-providers.js";

export { PROVIDER_CUSTOM, PROVIDER_ZEN, ZEN_BASE_URL, ZEN_DEFAULT_MODEL, fetchZenModels };

const aiLog = createLogger("AIService");
const DEFAULT_TIMEOUT_MS = 60000;
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 600000;

export const AI_CONFIG_KEY = "aiConfig";

export async function getAiConfig() {
  try {
    const data = await chrome.storage.local.get(AI_CONFIG_KEY);
    let cfg = data[AI_CONFIG_KEY];
    if (!cfg || typeof cfg !== "object") cfg = {};
    const provider = cfg.provider || detectProvider(cfg.baseUrl);
    const baseUrl = cfg.baseUrl || (provider === PROVIDER_ZEN ? ZEN_BASE_URL : "");

    return {
      provider,
      baseUrl,
      apiKey: cfg.apiKey || "",
      model: cfg.model || (provider === PROVIDER_ZEN ? ZEN_DEFAULT_MODEL : ""),
      timeoutMs: clampTimeout(cfg.timeoutMs),
    };
  } catch (_e) {
    return {
      provider: PROVIDER_CUSTOM,
      baseUrl: "",
      apiKey: "",
      model: "",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    };
  }
}

function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(ms)));
}

export async function setAiConfig(partial) {
  const current = await getAiConfig();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: next });
  aiLog.info("AI config updated (baseUrl=" + next.baseUrl + ", provider=" + next.provider + ")");
  return next;
}

export async function isAiAvailable() {
  const cfg = await getAiConfig();
  if (cfg.provider === PROVIDER_ZEN) return !!cfg.apiKey;
  if (cfg.provider === PROVIDER_CUSTOM) return !!cfg.apiKey;
  return false;
}

/**
 * Send a chat completion request to the configured AI provider.
 * @param {Object} params
 * @param {Array<{role:string,content:string}>} params.messages
 * @param {string} [params.model]
 * @param {number} [params.temperature] -- 0..2, default 0.7
 * @param {number} [params.max_tokens] -- passed through to provider body when a number
 * @param {number} [params.timeoutMs]
 * @param {Function} [params.fetchImpl] -- injectable for testing
 * @returns {Promise<{ok:boolean,text?:string,usage?:Object,error?:string,code?:string}>}
 */
export async function sendMessage(params) {
  const messages = params?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array", code: "BAD_INPUT" };
  }

  const cfg = await getAiConfig();

  if (cfg.provider === PROVIDER_ZEN && !cfg.apiKey) {
    return { ok: false, error: "AI not configured (apiKey missing)", code: "NO_API_KEY" };
  }
  if (cfg.provider === PROVIDER_CUSTOM && !cfg.apiKey) {
    return { ok: false, error: "AI not configured (apiKey missing)", code: "NO_API_KEY" };
  }

  const timeoutMs = clampTimeout(params.timeoutMs || cfg.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const fetchImpl = params.fetchImpl || fetch;

  const body = {
    messages,
    model: params.model || cfg.model,
    temperature: typeof params.temperature === "number" ? params.temperature : 0.7,
    stream: false,
  };
  if (typeof params.max_tokens === "number") body.max_tokens = params.max_tokens;

  const url = cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";

  const headers = { "Content-Type": "application/json" };
  headers["Authorization"] = "Bearer " + cfg.apiKey;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) {
      const code = response.status === 429 ? "RATE_LIMIT" : "HTTP_" + response.status;
      let errBody = "";
      try {
        errBody = await response.text();
      } catch (_e) {
        /* ignore */
      }
      aiLog.warn("AI HTTP " + response.status + ": " + errBody.slice(0, 200));
      return { ok: false, error: "HTTP " + response.status, code, httpBody: errBody.slice(0, 500) };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return { ok: false, error: "Invalid JSON in AI response: " + e.message, code: "BAD_JSON" };
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return { ok: false, error: "AI returned empty content", code: "EMPTY", raw: data };
    }

    return { ok: true, text: text.trim(), usage: data.usage || null };
  } catch (err) {
    const isAbort = err && (err.name === "AbortError" || /aborted/i.test(err.message || ""));
    if (isAbort) {
      return { ok: false, error: "Request timeout after " + timeoutMs + "ms", code: "TIMEOUT" };
    }
    aiLog.warn("AI network error: " + (err.message || String(err)));
    return { ok: false, error: err.message || String(err), code: "NETWORK" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
