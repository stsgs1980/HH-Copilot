/**
 * SERVICES: AI SERVICE — OLLAMA NATIVE
 * Ollama /api/chat implementation (bypasses CORS).
 *
 * Anti-hallucination: NEVER throws; always returns { ok:false, error, code }.
 * v1.9.86.0
 */

import { createLogger } from "../lib/anti-hallucination.js";

const ollamaLog = createLogger("AI-Ollama");

/**
 * Send chat completion via Ollama native API (/api/chat).
 * @param {Array<{role:string,content:string}>} messages
 * @param {string} model
 * @param {number} temperature
 * @param {number} timeoutMs
 * @param {Function} fetchImpl
 * @param {string} baseUrl
 * @returns {Promise<{ok:boolean,text?:string,error?:string,code?:string}>}
 */
export async function sendOllamaNative(messages, model, temperature, timeoutMs, fetchImpl, baseUrl) {
  const base = (baseUrl || "http://localhost:11434").replace(/\/v1\/?$/, "").replace(/\/$/, "");
  const url = base + "/api/chat";

  const body = {
    model,
    messages,
    stream: false,
    options: typeof temperature === "number" ? { temperature } : undefined,
  };

  ollamaLog.info("Ollama request: url=" + url + ", model=" + model + ", msgs=" + messages.length);

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:11434",
      },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    ollamaLog.info("Ollama response: status=" + response.status + ", ok=" + response.ok);

    if (!response.ok) {
      const code = response.status === 429 ? "RATE_LIMIT" : "HTTP_" + response.status;
      let errBody = "";
      try {
        errBody = await response.text();
      } catch (_e) {
        /* ignore */
      }
      ollamaLog.warn("Ollama HTTP " + response.status + ": " + errBody.slice(0, 500));
      return {
        ok: false,
        error: "HTTP " + response.status + ": " + errBody.slice(0, 200),
        code,
        httpBody: errBody.slice(0, 500),
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return { ok: false, error: "Invalid JSON from Ollama: " + e.message, code: "BAD_JSON" };
    }

    const text = data?.message?.content;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return { ok: false, error: "Ollama returned empty content", code: "EMPTY", raw: data };
    }

    return { ok: true, text: text.trim() };
  } catch (err) {
    const isAbort = err && (err.name === "AbortError" || /aborted/i.test(err.message || ""));
    if (isAbort) {
      return { ok: false, error: "Ollama timeout after " + timeoutMs + "ms", code: "TIMEOUT" };
    }
    ollamaLog.warn("Ollama network error: " + (err.message || String(err)));
    return { ok: false, error: err.message || String(err), code: "NETWORK" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
