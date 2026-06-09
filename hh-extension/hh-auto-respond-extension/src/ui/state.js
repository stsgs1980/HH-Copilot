/**
 * UI: SHARED STATE
 * ==================
 * Mutable shared state for UI modules.
 * Using object properties to avoid ES module read-only binding issues.
 */

export const panelState = {
  isOpen: false, isLoggedIn: null, status: 'idle',
  vacancies: [], stats: {}, resume: null, resumeList: [], activeTab: null
};

/**
 * Mutable DOM element references.
 * Object properties allow reassignment from any importing module.
 */
export const refs = {
  fabEl: null,
  sidebarEl: null,
  backdropEl: null,
  shadowRoot: null
};
