/**
 * SERVICES: AI PROVIDERS
 * =====================
 * Provider detection and model fetching.
 *
 * v1.9.87.0
 */

/** Provider types */
export const PROVIDER_CUSTOM = "custom";
export const PROVIDER_ZEN = "zen";

export const ZEN_BASE_URL = "https://opencode.ai/zen/v1";
export const ZEN_DEFAULT_MODEL = "mimo-v2.5-free";

/**
 * Single source of truth for provider UI defaults
 * (base URL prefill, api key placeholder, default model).
 */
export const PROVIDER_DEFAULTS = {
  zen: { baseUrl: "https://opencode.ai/zen/v1", apiKey: "", model: "mimo-v2.5-free" },
  custom: { baseUrl: "", apiKey: "", model: "" },
};

/**
 * Detect AI provider from baseUrl.
 * @param {string} baseUrl
 * @returns {'zen'|'custom'}
 */
export function detectProvider(baseUrl) {
  if (!baseUrl) return PROVIDER_CUSTOM;
  const u = baseUrl.toLowerCase();
  if (u.includes("opencode.ai")) return PROVIDER_ZEN;
  return PROVIDER_CUSTOM;
}

/**
 * Fetch model list from OpenCode Zen (GET /v1/models, public, no key).
 * Returns array of model id strings or [].
 * @param {string} [baseUrl] -- Zen base URL, defaults to https://opencode.ai/zen/v1
 * @param {Function} [fetchImpl] -- injectable for testing
 * @returns {Promise<string[]>}
 */
export async function fetchZenModels(baseUrl, fetchImpl) {
  const base = (baseUrl || ZEN_BASE_URL).replace(/\/$/, "");
  const url = base + "/models";
  const fetchFn = fetchImpl || globalThis.fetch.bind(globalThis);
  try {
    const resp = await fetchFn(url, { method: "GET" });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.map((m) => m.id).filter(Boolean);
  } catch (_e) {
    return [];
  }
}
