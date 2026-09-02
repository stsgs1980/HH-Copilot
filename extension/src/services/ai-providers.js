/**
 * SERVICES: AI PROVIDERS
 * =====================
 * Provider detection and Ollama model fetching.
 * Extracted from ai-service.js for AHG Rule 12 (250-line hard cap).
 *
 * v1.9.78.0
 */

/** Provider types */
export const PROVIDER_ZAI = "zai";
export const PROVIDER_OLLAMA = "ollama";
export const PROVIDER_CUSTOM = "custom";

export const OLLAMA_BASE_URL = "http://localhost:11434/v1";
export const OLLAMA_DEFAULT_MODEL = "llama3";

/**
 * Detect AI provider from baseUrl.
 * @param {string} baseUrl
 * @returns {'zai'|'ollama'|'custom'}
 */
export function detectProvider(baseUrl) {
  if (!baseUrl) return PROVIDER_ZAI;
  const u = baseUrl.toLowerCase();
  if (u.includes("z.ai")) return PROVIDER_ZAI;
  if (u.includes("localhost:11434") || u.includes("127.0.0.1:11434")) return PROVIDER_OLLAMA;
  return PROVIDER_CUSTOM;
}

/**
 * Fetch available models from Ollama (GET /api/tags).
 * Returns array of model names or empty array on error.
 * @param {string} [baseUrl] -- Ollama base URL, defaults to http://localhost:11434
 * @param {Function} [fetchImpl] -- injectable for testing
 * @returns {Promise<string[]>}
 */
export async function fetchOllamaModels(baseUrl, fetchImpl) {
  const base = (baseUrl || OLLAMA_BASE_URL).replace(/\/v1\/?$/, "").replace(/\/$/, "");
  const url = base + "/api/tags";
  const fetchFn = fetchImpl || globalThis.fetch.bind(globalThis);
  try {
    const resp = await fetchFn(url, { method: "GET" });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data || !Array.isArray(data.models)) return [];
    return data.models.map((m) => m.name).filter(Boolean);
  } catch (_e) {
    return [];
  }
}
