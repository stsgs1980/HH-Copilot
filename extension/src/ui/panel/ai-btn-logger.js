/**
 * UI: AI BUTTON LOGGER (F-CR-02)
 * =================================
 * Captures every step of the AI button click flow with timestamps,
 * so the user can copy-paste the log instead of explaining what happened.
 *
 * Three sinks:
 *   1. console.log('[AI-BTN] ...')          — DevTools Console (F12)
 *   2. window.__hhCopilotAIBtnLog            — array on window, dumpable from console
 *   3. chrome.storage.local.aiBtnLog         — persisted log (survives reload)
 *
 * Usage in DevTools console:
 *   __hhCopilotAIBtnLog                      — view array
 *   __hhCopilotAIBtnDump()                   — print formatted log
 *   __hhCopilotAIBtnClear()                  — clear log
 *
 * v1.9.57.0
 */

const LOG_MAX = 200; // cap in-memory log to last 200 entries

/** In-memory log buffer. */
const logBuffer = [];

/**
 * Safe JSON stringify that handles circular refs + truncates long strings.
 * @param {*} data
 * @returns {string}
 */
function safeStringify(data) {
  if (data === undefined) return 'undefined';
  if (data === null) return 'null';
  if (typeof data === 'string') {
    return data.length > 500 ? data.slice(0, 500) + '...(truncated)' : data;
  }
  if (typeof data !== 'object') return String(data);
  try {
    const seen = new WeakSet();
    const s = JSON.stringify(data, (key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      if (typeof val === 'string' && val.length > 300) {
        return val.slice(0, 300) + '...(truncated)';
      }
      return val;
    }, 0);
    return s;
  } catch (e) {
    return '[unserializable: ' + (e.message || String(e)) + ']';
  }
}

/**
 * Format a single log entry as a one-liner for console output.
 * @param {{ts:string, step:string, data:*}} entry
 * @returns {string}
 */
function formatEntry(entry) {
  const ts = entry.ts;
  const dataStr = entry.data === undefined ? '' : ' ' + safeStringify(entry.data);
  return '[' + ts + '] [AI-BTN] ' + entry.step + dataStr;
}

/**
 * Append a log entry to all three sinks.
 * @param {string} step -- short name of the step (e.g. 'click', 'ctx', 'send', 'resp-ok', 'resp-err')
 * @param {*} [data] -- optional payload (object/string/number)
 */
export function aiBtnLog(step, data) {
  const entry = {
    ts: new Date().toISOString(),
    step,
    data,
  };

  // 1. In-memory
  logBuffer.push(entry);
  if (logBuffer.length > LOG_MAX) {
    logBuffer.splice(0, logBuffer.length - LOG_MAX);
  }

  // 2. window global (for DevTools console access)
  if (typeof window !== 'undefined') {
    if (!Array.isArray(window.__hhCopilotAIBtnLog)) {
      window.__hhCopilotAIBtnLog = [];
    }
    window.__hhCopilotAIBtnLog.push(entry);
    if (window.__hhCopilotAIBtnLog.length > LOG_MAX) {
      window.__hhCopilotAIBtnLog.splice(0, window.__hhCopilotAIBtnLog.length - LOG_MAX);
    }
    // Helpers on window for easy DevTools access
    if (typeof window.__hhCopilotAIBtnDump !== 'function') {
      window.__hhCopilotAIBtnDump = () => {
        const lines = (window.__hhCopilotAIBtnLog || []).map(formatEntry);
        console.log(lines.join('\n'));
        return lines.join('\n');
      };
    }
    if (typeof window.__hhCopilotAIBtnClear !== 'function') {
      window.__hhCopilotAIBtnClear = () => {
        window.__hhCopilotAIBtnLog = [];
        logBuffer.length = 0;
        console.log('[AI-BTN] log cleared');
      };
    }
  }

  // 3. Console (always)
  try {
    console.log(formatEntry(entry));
  } catch (_e) { /* ignore */ }

  // 4. chrome.storage.local (best-effort, async, fire-and-forget)
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('aiBtnLog', (res) => {
        const arr = Array.isArray(res && res.aiBtnLog) ? res.aiBtnLog : [];
        arr.push(entry);
        if (arr.length > LOG_MAX) {
          arr.splice(0, arr.length - LOG_MAX);
        }
        chrome.storage.local.set({ aiBtnLog: arr }, () => {
          // Silent — storage write must never break the click flow
        });
      });
    }
  } catch (_e) { /* ignore */ }
}

/**
 * Get all in-memory log entries as a formatted multi-line string.
 * Useful for copying into a chat message.
 * @returns {string}
 */
export function getAiBtnLogText() {
  return logBuffer.map(formatEntry).join('\n');
}

/**
 * Clear the in-memory log (does NOT clear chrome.storage).
 */
export function clearAiBtnLog() {
  logBuffer.length = 0;
  if (typeof window !== 'undefined' && Array.isArray(window.__hhCopilotAIBtnLog)) {
    window.__hhCopilotAIBtnLog.length = 0;
  }
  try {
    console.log('[AI-BTN] log cleared');
  } catch (_e) { /* ignore */ }
}

/** Exports for tests. */
export const _internal = {
  logBuffer,
  formatEntry,
  safeStringify,
  LOG_MAX,
};
