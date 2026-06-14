/**
 * UI: AUTH CHECK
 * ===============
 * Main authentication check API (sync + async).
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

import { isLoggedOut, isLoggedIn } from './auth-detection.js';

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
      return syncResult; // Background unavailable -- trust sync
    }
    if (!cookieResult) {
      console.log('[HH-AR][Auth] Async: sync=authorized, cookies=NO -> false');
      return false;
    }
    return true;
  }

  // Sync says NOT authorized — check cookies as potential override
  const cookieResult = await checkCookiesViaBackground();
  if (cookieResult === true) {
    console.log('[HH-AR][Auth] Async: sync=not authorized, cookies=YES -> true (cookie override)');
    return true;
  }

  return false;
}

/** Reset auth state (kept for API compatibility) */
export function resetAuthCache() {
  // No-op since we no longer cache — but keeps the API stable
}
