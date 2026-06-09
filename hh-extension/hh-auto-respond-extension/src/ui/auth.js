/**
 * UI: AUTH
 * ===========
 * HH.ru authentication detection and user name extraction.
 *
 * Strategy (3-way check, no caching):
 *
 * 1. HARD NEGATIVE — URL is explicitly a login/signup page → NOT authorized.
 * 2. SOFT NEGATIVE — look for "Войти" text ONLY in the page header (top 120px).
 *    Prevents false positives from page content (banners, etc.).
 * 3. POSITIVE — look for logged-in-only elements:
 *    - data-qa selectors (mainmenu_applicant, user_name, etc.)
 *    - Links to /applicant/* pages (resumes, negotiations — only exist when logged in)
 *    - Header navigation items that are hidden when logged out
 * 4. If neither decisive → default to NOT authorized.
 *
 * NO caching — each call scans the actual DOM state.
 */

// ─── NEGATIVE DETECTION ──────────────────────────────────────────────

/**
 * Check if the user is logged out.
 * Uses layered checks: URL, data-qa, inputs, and HEADER-ONLY text scan.
 */
function isLoggedOut() {
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
function isLoggedIn() {
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

// ─── MAIN AUTH CHECK (no caching, always fresh) ──────────────────────

export function checkAuth() {
  // 1. NEGATIVE CHECK FIRST — if logged-out indicators exist, NOT authorized
  if (isLoggedOut()) {
    console.log('[HH-AR][Auth] checkAuth → false (isLoggedOut detected)');
    return false;
  }

  // 2. POSITIVE CHECK — if logged-in elements found, authorized
  if (isLoggedIn()) {
    console.log('[HH-AR][Auth] checkAuth → true (isLoggedIn detected)');
    return true;
  }

  // 3. No decisive evidence — default to NOT authorized
  console.log('[HH-AR][Auth] checkAuth → false (no decisive evidence)');
  return false;
}

// ─── ASYNC AUTH CHECK with cookie API ────────────────────────────────

function checkCookiesViaBackground() {
  return new Promise((resolve) => {
    let settled = false;
    try {
      chrome.runtime.sendMessage(
        { type: 'check-auth-cookies' },
        (response) => {
          if (settled) return;
          settled = true;
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
      if (!settled) { settled = true; resolve(null); }
    }
    // Safety timeout
    setTimeout(() => {
      if (!settled) { settled = true; resolve(null); }
    }, 3000);
  });
}

/**
 * Enhanced async auth check with cookie API verification.
 * Use for manual re-checks triggered by user clicks.
 *
 * If sync check says NOT authorized but cookies say YES → trust cookies.
 * This handles the case where DOM selectors haven't matched yet after login.
 */
export async function checkAuthAsync() {
  const syncResult = checkAuth();

  if (syncResult) {
    // Sync says "authorized" — verify via cookies as second opinion
    const cookieResult = await checkCookiesViaBackground();
    if (cookieResult === null) {
      return syncResult; // Background unavailable — trust sync
    }
    if (!cookieResult) {
      console.log('[HH-AR][Auth] Async: sync=authorized, cookies=NO → false');
      return false;
    }
    return true;
  }

  // Sync says NOT authorized — check cookies as potential override
  const cookieResult = await checkCookiesViaBackground();
  if (cookieResult === true) {
    console.log('[HH-AR][Auth] Async: sync=not authorized, cookies=YES → true (cookie override)');
    return true;
  }

  return false;
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
    '[data-qa="user-name"]',
    '[data-qa="supernova-user-switcher"]',
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

  // Fallback: try to find applicant link with text in header
  try {
    const links = document.querySelectorAll('a[href*="/applicant/"]');
    for (const el of links) {
      const rect = el.getBoundingClientRect();
      if (rect.top > 120) continue;
      const name = (el.textContent || '').trim();
      if (name && name.length > 1 && name.length < 100) {
        return name;
      }
    }
  } catch (e) {}

  return 'Пользователь';
}
