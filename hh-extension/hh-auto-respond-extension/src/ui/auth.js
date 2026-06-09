/**
 * UI: AUTH
 * ===========
 * HH.ru authentication detection and user name extraction.
 *
 * Strategy:
 * 1. NEGATIVE CHECK — scan all visible links/buttons for "Войти" text,
 *    check for login-specific data-qa attributes, check for login form inputs.
 *    If ANY logged-out indicator found → return false.
 * 2. POSITIVE CHECK — look for elements that ONLY exist when logged in:
 *    user name, applicant menu, my resumes link, notification badge.
 * 3. If neither found → default to NOT authorized (safer than false positive).
 *
 * NO caching — each call scans the actual DOM state.
 */

// ─── NEGATIVE DETECTION ──────────────────────────────────────────────

/**
 * Check if the user is logged out by looking for login-related indicators.
 * Uses both attribute selectors AND text content scanning.
 */
function isLoggedOut() {
  // 1. Check specific data-qa selectors for login elements
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

  // 2. Check for login form inputs (only visible when on login page)
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

  // 3. TEXT SCAN — look for "Войти" text in visible buttons/links
  //    This catches any login button regardless of data-qa attributes
  const allButtons = document.querySelectorAll('a, button, [role="button"]');
  for (const el of allButtons) {
    if (!document.body.contains(el)) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const text = (el.textContent || '').trim();
    // Match "Войти" as standalone text (not part of longer text like "Войти и создать")
    if (text === 'Войти') {
      return true;
    }
  }

  // 4. Check URL — if on login/account page, likely not authorized
  const url = window.location.pathname;
  if (/\/account\/login/.test(url) || /\/login/.test(url)) {
    return true;
  }

  return false;
}

// ─── POSITIVE DETECTION ───────────────────────────────────────────────

/**
 * Check if the user is logged in by looking for applicant-specific elements.
 * Only uses selectors that CANNOT exist on the logged-out page.
 */
function isLoggedIn() {
  const authSelectors = [
    '[data-qa="mainmenu_applicant"]',
    '[data-qa="mainmenu_user_name"]',
    'a[data-qa="mainmenu_myResumes"]',
    '[data-qa="mainmenu"] sup',                // Notification badge
    '.supernova-nav__item--applicant',          // React nav applicant
    '.mainmenu__item--applicant',
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

  // Also check for links to /applicant/ pages (only visible when logged in)
  const applicantLinks = document.querySelectorAll('a[href*="/applicant/"]');
  for (const el of applicantLinks) {
    if (!document.body.contains(el)) continue;
    const style = window.getComputedStyle(el);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      return true;
    }
  }

  return false;
}

// ─── MAIN AUTH CHECK (no caching, always fresh) ──────────────────────

export function checkAuth() {
  // 1. NEGATIVE CHECK FIRST — if logged-out indicators exist, NOT authorized
  if (isLoggedOut()) {
    return false;
  }

  // 2. POSITIVE CHECK — if logged-in elements found, authorized
  if (isLoggedIn()) {
    return true;
  }

  // 3. No decisive evidence — default to NOT authorized
  return false;
}

// ─── ASYNC AUTH CHECK with cookie API ────────────────────────────────

function checkCookiesViaBackground() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'check-auth-cookies' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          if (response && typeof response.hasAuthCookie === 'boolean') {
            resolve(response.hasAuthCookie);
          } else {
            resolve(null);
          }
        }
      );
    } catch (e) {
      resolve(null);
    }
    setTimeout(() => resolve(null), 3000);
  });
}

/**
 * Enhanced async auth check with cookie API verification.
 * Use for manual re-checks triggered by user clicks.
 */
export async function checkAuthAsync() {
  const syncResult = checkAuth();

  if (!syncResult) {
    return false;
  }

  // Sync says "authorized" — verify via cookies as second opinion
  const cookieResult = await checkCookiesViaBackground();
  if (cookieResult === null) {
    return syncResult; // Background unavailable — trust sync
  }

  if (!cookieResult) {
    console.log('[HH-AR][Auth] Sync said authorized, but cookies say NO');
    return false;
  }

  return true;
}

/** Reset auth state (kept for API compatibility) */
export function resetAuthCache() {
  // No-op since we no longer cache — but keeps the API stable
}

// ─── USER NAME EXTRACTION ────────────────────────────────────────────

export function getUserName() {
  const nameSelectors = [
    '[data-qa="mainmenu_user_name"]',
    '.supernova-nav__item--applicant',
    'a[href*="/applicant/"]',
  ];
  for (const sel of nameSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const name = (el.textContent || '').trim();
        if (name && name.length > 0 && name.length < 100) {
          return name;
        }
      }
    } catch (e) {}
  }
  return 'Пользователь';
}
