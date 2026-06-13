/**
 * UI: AUTH (barrel re-export)
 * ============================
 * Re-exports from split modules for backward compatibility.
 *
 * All existing imports of checkAuth, checkAuthAsync, resetAuthCache, getUserName
 * from '../ui/auth.js' or './auth.js' continue to work unchanged.
 *
 * Modules:
 *   - auth-detection.js — isLoggedOut(), isLoggedIn() (pure DOM detection)
 *   - auth-check.js     — checkAuth(), checkAuthAsync(), resetAuthCache()
 *   - auth-user.js      — getUserName()
 */

export { isLoggedOut, isLoggedIn } from './auth-detection.js';
export { checkAuth, checkAuthAsync, resetAuthCache } from './auth-check.js';
export { getUserName } from './auth-user.js';
