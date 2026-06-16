/**
 * PARSERS: NEGOTIATIONS CHAT THREAD (F4.3)
 * =========================================
 * Parses the messages thread inside an open negotiation.
 *
 * On hh.ru /applicant/negotiations, when a conversation is opened,
 * a chat panel renders messages with data-qa="chatik-*" attributes.
 * Each message bubble has chat-cell-creation-time + chat-cell-meta.
 *
 * Public API:
 *   - parseChatThread(root) -> Array<{ from, text, time }>
 *       from: 'user' | 'employer'
 *       text: string (trimmed, non-empty)
 *       time: string (ISO-ish or hh:mm)
 *   - extractThreadForAI(messages) -> Array<{ role, content }>
 *       Maps to OpenAI/ZAI chat format: user/assistant roles
 *
 * Anti-hallucination:
 *   - Skip messages with empty text
 *   - Never throw — return [] on any error
 *   - Detect sender by direction class or data-qa suffix (in/out)
 *
 * v1.9.45.0
 */

import { safeGetText } from '../lib/anti-hallucination.js';

/** Selectors for a single chat message bubble. */
const MSG_SELECTORS = [
  '[data-qa^="chat-cell-"]',
  '[class*="chat-message"]',
  '[class*="msg-item"]',
];

/** Selectors that indicate the message is from the user (applicant). */
const USER_FLAG_SELECTORS = [
  '[data-qa*="outgoing"]',
  '[data-qa*="-out"]',
  '[class*="msg-out"]',
  '[class*="message-out"]',
  '[class*="self-message"]',
  '[class*="from-me"]',
];

/** Selectors for the message text content. */
const TEXT_SELECTORS = [
  '[data-qa="chat-cell-text"]',
  '[data-qa*="chat-cell-text"]',
  '[class*="msg-text"]',
  '[class*="message-text"]',
  '[class*="msg-body"]',
];

/** Selectors for the message timestamp. */
const TIME_SELECTORS = [
  '[data-qa="chat-cell-creation-time"]',
  '[data-qa*="creation-time"]',
  'time',
  '[class*="msg-time"]',
];

/**
 * Detect whether a message bubble was sent by the user (applicant).
 * @param {Element} cell
 * @returns {boolean}
 */
function isUserMessage(cell) {
  for (const sel of USER_FLAG_SELECTORS) {
    if (cell.matches && cell.matches(sel)) return true;
    if (cell.querySelector && cell.querySelector(sel)) return true;
  }
  // Fallback: aligned-right heuristic (hh.ru typically right-aligns user msgs)
  if (cell.classList) {
    for (const cls of cell.classList) {
      if (typeof cls === 'string' && /right|outgoing|self|me/.test(cls)) return true;
    }
  }
  return false;
}

/**
 * Extract text content from a single message bubble.
 * Tries multiple selectors, falls back to innerText.
 */
function extractMessageText(cell) {
  for (const sel of TEXT_SELECTORS) {
    const el = cell.querySelector ? cell.querySelector(sel) : null;
    if (el) {
      const text = safeGetText(el, '');
      if (text) return text;
    }
  }
  // Fallback: whole cell text (minus time)
  return safeGetText(cell, '').trim();
}

/**
 * Extract timestamp from a message bubble.
 */
function extractMessageTime(cell) {
  for (const sel of TIME_SELECTORS) {
    const el = cell.querySelector ? cell.querySelector(sel) : null;
    if (el) {
      const t = safeGetText(el, '') || el.getAttribute?.('datetime') || '';
      if (t) return t;
    }
  }
  return '';
}

/**
 * Check if an element is itself a text/time sub-element (not a cell).
 * Used to filter out children of cells that match the same prefix selector.
 */
function isSubElement(el) {
  if (!el || !el.matches) return false;
  for (const sel of TEXT_SELECTORS) {
    try { if (el.matches(sel)) return true; } catch (_e) {}
  }
  for (const sel of TIME_SELECTORS) {
    try { if (el.matches(sel)) return true; } catch (_e) {}
  }
  return false;
}

/**
 * Query root for the first selector that returns matches, then filter out
 * any sub-elements (text/time/meta) that match the same prefix.
 * @param {Element|Document} root
 * @param {string[]} selectors
 * @returns {Element[]}
 */
function queryFirstMatch(root, selectors) {
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els && els.length > 0) {
        return Array.from(els).filter(el => el && !isSubElement(el));
      }
    } catch (_e) { /* invalid selector */ }
  }
  return [];
}

/**
 * Parse all chat messages from a thread container.
 * @param {Document|Element} root
 * @returns {Array<{from:string,text:string,time:string}>}
 */
export function parseChatThread(root) {
  root = root || document;
  if (!root || !root.querySelectorAll) return [];

  const cells = queryFirstMatch(root, MSG_SELECTORS);
  if (!cells || cells.length === 0) return [];

  const messages = [];
  for (const cell of cells) {
    if (!cell) continue;
    const text = extractMessageText(cell);
    if (!text) continue; // anti-ghost
    const time = extractMessageTime(cell);
    const from = isUserMessage(cell) ? 'user' : 'employer';
    messages.push({ from, text, time });
  }

  return messages;
}

/**
 * Convert internal message format to ZAI/OpenAI chat format.
 * user -> user role
 * employer -> assistant role (pretend AI is the employer for context)
 *
 * Note: ZAI uses 'assistant' for system/side messages. We map employer
 * messages to 'assistant' so the AI sees them as prior turns in the convo.
 *
 * @param {Array<{from:string,text:string}>} messages
 * @returns {Array<{role:string,content:string}>}
 */
export function extractThreadForAI(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(m => m && m.text && typeof m.text === 'string')
    .map(m => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
}

/**
 * Build a fallback prompt when there's no chat history yet
 * (e.g., user wants to initiate the conversation).
 *
 * @param {Object} conv -- { vacancyTitle, company }
 * @returns {Array<{role:string,content:string}>}
 */
export function buildStarterPrompt(conv) {
  const vac = (conv && conv.vacancyTitle) || 'вакансия';
  const comp = (conv && conv.company) || 'компания';
  return [
    {
      role: 'user',
      content: 'Здравствуйте! Пишу по поводу вакансии "' + vac + '" в ' + comp +
        '. Хотел бы узнать, актуальна ли ещё позиция и какие дальнейшие шаги?',
    },
  ];
}

/** Exported for tests. */
export const _internal = {
  MSG_SELECTORS,
  USER_FLAG_SELECTORS,
  TEXT_SELECTORS,
  TIME_SELECTORS,
  isUserMessage,
  extractMessageText,
  extractMessageTime,
};
