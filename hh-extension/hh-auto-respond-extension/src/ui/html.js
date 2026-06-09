/**
 * UI: SIDEBAR HTML
 * ==================
 * HTML templates and HTML-escape helper for the Shadow DOM sidebar.
 */

export function getSidebarHTML() {
  return '<div class="har-header"><h3>HH Auto-Respond</h3><span class="har-version">v1.3.0</span></div><div class="har-content"><div class="har-auth-box"><div class="har-spinner"></div><h3>Проверяем авторизацию...</h3><p>Определяем статус на hh.ru</p></div></div>';
}

export function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export function scoreClass(s) { return s >= 70 ? 'high' : s >= 40 ? 'medium' : 'low'; }
