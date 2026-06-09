// ═══════════════════════════════════════════════
// UI MODULES — barrier index
// ═══════════════════════════════════════════════

export { refs, panelState } from './state.js';
export { getSidebarCSS } from './styles.js';
export { getSidebarHTML, esc, scoreClass } from './html.js';
export { checkAuth, getUserName } from './auth.js';
export { createFab, updateFabIcon } from './fab.js';
export { renderVacancyList, renderStatsValues } from './tabs/vacancies.js';
export { renderResumePanel, renderResumeListPanel, getResumePageType } from './tabs/resumes.js';
export { createSidebar, toggleSidebar, renderSidebarContent, renderLoggedInContent, updateAuthState, createPanel, updateVacancies, updateStats, setStatus } from './panel.js';
