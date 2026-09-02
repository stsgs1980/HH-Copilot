/**
 * UI: TABS -- NEGOTIATIONS AI SERVICE (F4.3)
 * ===========================================
 * Background transport + AI reply request logic.
 * Extracted from negotiations-ai-reply.js for Rule 12.
 */

import { buildStarterPrompt, extractThreadForAI, parseChatThread } from "../../parsers/negotiations-thread.js";

async function sendBg(msg, msgImpl) {
  const sender = msgImpl || (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage);
  if (!sender) {
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
      resolve({ ok: false, error: e.message, code: "BG_THROW" });
    }
  });
}

export async function requestAiReply(conv, tone, impls) {
  const threadRoot = (impls && impls.threadRoot) || document;
  const msgImpl = impls && impls.msgImpl;

  let history;
  try {
    const msgs = parseChatThread(threadRoot);
    history = extractThreadForAI(msgs);
  } catch (_e) {
    history = [];
  }

  const messages = history.length > 0 ? history : buildStarterPrompt(conv);

  const result = await sendBg(
    {
      type: "ai-chat-reply",
      history: messages,
      opts: { tone, variants: 3 },
    },
    msgImpl,
  );

  if (!result.ok) return result;

  const variants = Array.isArray(result.variants)
    ? result.variants.filter((v) => typeof v === "string" && v.trim().length > 0)
    : [];

  if (variants.length === 0) {
    return { ok: false, error: "AI returned no usable variants", code: "EMPTY_VARIANTS" };
  }

  return { ok: true, variants };
}
