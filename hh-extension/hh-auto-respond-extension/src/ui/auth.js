/**
 * UI: AUTH
 * ===========
 * HH.ru authentication detection and user name extraction.
 */

// AUTH CHECK
// NOTE: offsetParent === null для position:fixed элементов, поэтому НЕ проверяем его.
// Проверяем только: элемент существует, не скрыт через display:none / visibility:hidden.
export function checkAuth() {
  const selectors = [
    '[data-qa="mainmenu_applicant"]',
    '[data-qa="mainmenu_user_name"]',
    'a[data-qa="mainmenu_myResumes"]',
    '[data-qa="mainmenu"] sup',
    '.supernova-nav__item--applicant',
    'a[href*="/applicant/"]',
    'a[href*="/account"]',
    '.bloko-header-hamburger',
    '[data-qa="mainmenu"] a[href*="resumes"]',
    '.mainmenu__item--applicant',
    '[data-qa="mainmenu"]',
    '.HH-React-Header-Nav',
    'nav[class*="nav"] a[href*="resumes"]',
    // Cookie fallback: если есть cookie с именем пользователя, точно авторизован
  ];
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      // Проверяем что не скрыт через display:none или visibility:hidden
      if (document.body.contains(el)) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log('[HH-AR][Auth] Found auth element:', sel);
          return true;
        }
      }
    } catch (e) { /* invalid selector */ }
  }
  // Cookie-based fallback: ищем cookie hhruuid или _HH-RU-Auth
  const cookies = document.cookie || '';
  if (cookies.includes('hhruuid') || cookies.includes('_HH-RU') || cookies.includes('hhtoken')) {
    console.log('[HH-AR][Auth] Found auth cookie');
    return true;
  }
  console.log('[HH-AR][Auth] No auth indicators found');
  return false;
}

export function getUserName() {
  // Попробуем несколько вариантов получения имени
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
          console.log('[HH-AR][Auth] User name from:', sel, '=', name);
          return name;
        }
      }
    } catch (e) {}
  }
  console.log('[HH-AR][Auth] Could not extract user name, using default');
  return 'Пользователь';
}
