/**
 * LIB: ANTI-HALLUCINATION
 * ========================
 * Safe DOM access helpers, validation, and logging.
 * Prevents "hallucinated" data from invisible/hidden elements.
 */

// ===============================================
// SAFE DOM ACCESS
// ===============================================

export function safeGetText(el, fallback) {
  fallback = fallback || '';
  if (!el || !(el instanceof Element)) return fallback;
  if (el.offsetParent === null && document.body.contains(el)) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return fallback;
  }
  const text = (el.textContent || '').trim();
  return text.length > 0 ? text : fallback;
}

export function safeGetAttr(el, attr, fallback) {
  fallback = fallback || '';
  if (!el || !(el instanceof Element)) return fallback;
  const v = el.getAttribute(attr);
  return v !== null ? v : fallback;
}

// ===============================================
// VALIDATION
// ===============================================

export function validateVacancyData(v) {
  const errors = [];
  if (!v || typeof v !== 'object') return { valid: false, errors: ['not an object'] };
  if (!v.title || typeof v.title !== 'string' || v.title.trim().length < 3) errors.push('bad title');
  if (!v.company || typeof v.company !== 'string') errors.push('bad company');
  if (!v.url || typeof v.url !== 'string' || !v.url.startsWith('https://hh.ru/')) errors.push('bad url');
  if (!v.id || typeof v.id !== 'string') errors.push('bad id');
  return { valid: errors.length === 0, errors };
}

export function extractVacancyId(url) {
  if (!url || typeof url !== 'string') return '';
  // Standard: /vacancy/123456
  const m = url.match(/\/vacancy\/(\d+)/);
  if (m) return m[1];
  // VotD tracking URL: vacancyId=123456 in query params
  // e.g. content.hh.ru/api/v1/vacancy_of_the_day/click?vacancyId=132537734&...
  const qp = url.match(/[?&]vacancyId=(\d+)/);
  if (qp) return qp[1];
  return '';
}

// ===============================================
// ASYNC DOM HELPERS
// ===============================================

export function waitForElement(selectors, timeout, root) {
  timeout = timeout || 10000;
  root = root || document;
  const checkVisible = (el) => {
    if (!el) return false;
    const container = root === document ? document.body : root;
    if (!container.contains(el)) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  return new Promise(resolve => {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (checkVisible(el)) { resolve(el); return; }
      } catch (_e) {}
    }
    const startTime = Date.now();
    const observer = new MutationObserver(() => {
      if (Date.now() - startTime > timeout) { observer.disconnect(); resolve(null); return; }
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel);
          if (checkVisible(el)) { observer.disconnect(); resolve(el); return; }
        } catch (_e) {}
      }
    });
    observer.observe(root.body || root, { childList: true, subtree: true });
  });
}

export function safeClick(el, label) {
  if (!el || !(el instanceof Element) || el.disabled) return false;
  if (!document.body.contains(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  el.click();
  return true;
}

export function safeInput(el, text, label) {
  if (!el || !(el instanceof HTMLElement) || el.disabled || el.readOnly) return false;
  if (typeof text !== 'string' || text.length === 0) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) { setter.call(el, text); } else { el.value = text; }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// ===============================================
// LOGGER
// ===============================================

export function createLogger(module) {
  return {
    info: (action, data) => console.log('[HH-AR][' + module + '] ' + action, data || ''),
    warn: (action, data) => console.warn('[HH-AR][' + module + '] ' + action, data || ''),
    error: (action, data) => console.error('[HH-AR][' + module + '] ' + action, data || ''),
  };
}
