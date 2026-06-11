/**
 * UI: AUTH DETECTION
 * ==================
 * Pure DOM-based detection functions for HH.ru authentication state.
 *
 * These are internal helpers used by auth-check.js.
 * Exported for testability, but not part of the public auth API.
 */

// ─── NEGATIVE DETECTION ──────────────────────────────────────────────

/**
 * Check if the user is logged out.
 * Uses layered checks: URL, data-qa, inputs, and HEADER-ONLY text scan.
 */
export function isLoggedOut() {
  // 1. URL check — if explicitly on login/signup page
  const url = window.location.pathname;
  if (/\/account\/login/.test(url) || /\/login/.test(url) || /\/signup/.test(url)) {
    return true;
  }

  // 2. Check specific data-qa selectors for login elements (only in visible DOM)
  const loginSelectors = [
    '[data-qa="login"]',
    '[data-qa="login-button"]',
    '[data-qa="account-login"]',
    '[data-qa="signup"]',
    '[data-qa="signup-button"]',
  ];
  for (const sel of loginSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && document.body.contains(el)) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return true;
        }
      }
    } catch (e) {}
  }

  // 3. Check for visible login form inputs
  const inputSelectors = [
    'input[name="login"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[type="password"]',
    '[data-qa="login-input"]',
    '[data-qa="login-email"]',
  ];
  for (const sel of inputSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && document.body.contains(el)) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return true;
        }
      }
    } catch (e) {}
  }

  // 4. TEXT SCAN — look for "Войти" ONLY in the HEADER area (top 120px).
  //    Scanning the entire page caused false positives from banners, content, etc.
  const allButtons = document.querySelectorAll('a, button, [role="button"]');
  for (const el of allButtons) {
    if (!document.body.contains(el)) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    // ONLY check elements in the header area (top 120px)
    try {
      const rect = el.getBoundingClientRect();
      if (rect.top > 120 || rect.bottom < 0) continue;
    } catch (e) { continue; }

    const text = (el.textContent || '').trim();
    // Match "Войти" as standalone text (not "Войти и создать", etc.)
    if (text === 'Войти') {
      return true;
    }
  }

  return false;
}

// ─── POSITIVE DETECTION ───────────────────────────────────────────────

/**
 * Check if the user is logged in by looking for applicant-specific elements.
 * Uses multiple strategies: data-qa, href patterns, and nav class names.
 */
export function isLoggedIn() {
  const authSelectors = [
    // data-qa selectors (primary — hh.ru test automation attributes)
    '[data-qa="mainmenu_applicant"]',
    '[data-qa="mainmenu_user_name"]',
    'a[data-qa="mainmenu_myResumes"]',
    '[data-qa="mainmenu"] sup',                // Notification badge in menu
    '.supernova-nav__item--applicant',          // React nav applicant item
    '.mainmenu__item--applicant',               // Classic nav applicant item

    // Links to applicant pages (only accessible when logged in)
    'a[href="/applicant/resumes"]',
    'a[href="/applicant/negotiations"]',
    'a[href="/applicant/vacancies"]',
    'a[href="/applicant/job_search"]',
    'a[href="/applicant/favorites"]',

    // Wildcard href match (but only in header/nav area)
    // These are checked below with position filtering

    // Additional data-qa patterns that may appear
    '[data-qa="applicant-menu"]',
    '[data-qa="user-menu"]',
    '[data-qa="header-user"]',
    '[data-qa="supernova-user-switcher"]',
  ];

  for (const sel of authSelectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      if (!document.body.contains(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    } catch (e) {}
  }

  // Additional check: any link to /applicant/ in the top 120px (header nav)
  try {
    const navLinks = document.querySelectorAll('a[href*="/applicant/"]');
    for (const el of navLinks) {
      if (!document.body.contains(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.top > 120 || rect.bottom < 0) continue;
      return true;
    }
  } catch (e) {}

  return false;
}
