/**
 * UI: AUTH USER
 * =============
 * User name extraction from the HH.ru DOM.
 */

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
    } catch (_e) {}
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
  } catch (_e) {}

  return 'Пользователь';
}
