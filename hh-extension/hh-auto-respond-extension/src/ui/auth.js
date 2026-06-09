/**
 * UI: AUTH
 * ===========
 * HH.ru authentication detection and user name extraction.
 *
 * Strategy (in priority order):
 * 1. NEGATIVE CHECK — look for logged-out indicators first ("Войти" button, login form).
 *    If found → definitely NOT authorized, return false immediately.
 * 2. DOM SELECTORS — look for applicant-specific elements that ONLY exist when logged in.
 *    Uses strict selectors only, no broad containers.
 * 3. chrome.cookies API — send message to background to check for hhtoken cookie.
 *    This is the most reliable method since it bypasses httpOnly limitations.
 */

let authLogged = false; // suppress repeated auth logs
let authResult = null; // cache result
let authCheckInProgress = false;

// ─── NEGATIVE DETECTION (logged-out indicators) ─────────────────────

const LOGGED_OUT_SELECTORS = [
  // Login button on logged-out pages
  '[data-qa="login"]',
  'a[data-qa="login"]',
  // "Войти" link
  'a[href*="/login"]',
  // Register button
  '[data-qa="signup"]',
  'a[data-qa="signup"]',
  'a[href*="/signup"]',
  // Login form inputs
  'input[name="login"], input[name="username"], input[name="email"]',
];

function isLoggedOut() {
  for (const sel of LOGGED_OUT_SELECTORS) {
    try {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (!document.body.contains(el)) continue;
        const style = window.getComputedStyle(el);
        // Must be visible
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        // Must be an actual interactive element (button/link/input)
        const tag = el.tagName.toLowerCase();
        if (['a', 'button', 'input'].includes(tag)) {
          return true;
        }
        // Also check for elements that contain "Войти" text
        if (el.textContent && el.textContent.trim() === 'Войти') {
          return true;
        }
      }
    } catch (e) { /* invalid selector */ }
  }
  return false;
}

// ─── POSITIVE DETECTION (logged-in indicators) ────────────────────────

const AUTH_SELECTORS = [
  // These ONLY appear when user is logged in:
  '[data-qa="mainmenu_applicant"]',
  '[data-qa="mainmenu_user_name"]',
  'a[data-qa="mainmenu_myResumes"]',
  '[data-qa="mainmenu"] sup',           // Notification badge in menu
  '.supernova-nav__item--applicant',    // React header applicant nav
  'a[href*="/applicant/resumes"]',      // Direct link to resumes
  '.mainmenu__item--applicant',
];

function isAuthorizedDOM() {
  for (const sel of AUTH_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      if (!document.body.contains(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return { authorized: true, selector: sel };
      }
    } catch (e) { /* invalid selector */ }
  }
  return { authorized: false, selector: null };
}

// ─── COOKIE CHECK via Background Script ────────────────────────────────

function checkCookiesViaBackground() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'check-auth-cookies' },
        (response) => {
          if (chrome.runtime.lastError) {
            // Background not available or other error
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
    // Timeout fallback — don't block forever
    setTimeout(() => resolve(null), 3000);
  });
}

// ─── MAIN AUTH CHECK ─────────────────────────────────────────────────

export function checkAuth() {
  const url = window.location.href;

  // Return cached if URL hasn't changed
  if (authResult !== null && authResult._url === url) {
    return authResult.loggedIn;
  }

  // 1. NEGATIVE CHECK FIRST — if logged-out indicators exist, bail out
  if (isLoggedOut()) {
    if (!authLogged) {
      console.log('[HH-AR][Auth] NOT authorized (logged-out indicators found)');
      authLogged = true;
    }
    authResult = { loggedIn: false, _url: url };
    return false;
  }

  // 2. POSITIVE DOM CHECK — look for logged-in-only elements
  const domResult = isAuthorizedDOM();
  if (domResult.authorized) {
    if (!authLogged) {
      console.log('[HH-AR][Auth] Authorized (selector:', domResult.selector + ')');
      authLogged = true;
    }
    authResult = { loggedIn: true, _url: url };
    return true;
  }

  // 3. No decisive DOM evidence — default to NOT authorized
  //    (better to show "not authorized" than falsely show "authorized")
  if (!authLogged) {
    console.log('[HH-AR][Auth] No auth indicators found — assuming NOT authorized');
    authLogged = true;
  }
  authResult = { loggedIn: false, _url: url };
  return false;
}

// ─── ASYNC AUTH CHECK with cookie API ────────────────────────────────
/**
 * Enhanced auth check that also verifies via chrome.cookies API.
 * Use this for manual re-checks triggered by user clicks.
 * Falls back to synchronous checkAuth() if background is unavailable.
 */
export async function checkAuthAsync() {
  const syncResult = checkAuth();

  // If sync says "not authorized", trust it (negative check is reliable)
  if (!syncResult) {
    return false;
  }

  // Sync says "authorized" — verify via cookies as second opinion
  const cookieResult = await checkCookiesViaBackground();
  if (cookieResult === null) {
    // Background unavailable — trust sync result
    return syncResult;
  }

  if (!cookieResult) {
    // Cookies say NO auth — override sync result
    console.log('[HH-AR][Auth] Sync said authorized, but cookies say NO — overriding to NOT authorized');
    authResult.loggedIn = false;
    return false;
  }

  return true;
}

/** Reset auth cache (call after login/logout) */
export function resetAuthCache() {
  authResult = null;
  authLogged = false;
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
