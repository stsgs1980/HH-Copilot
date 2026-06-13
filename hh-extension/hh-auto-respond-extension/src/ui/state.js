/**
 * UI: SHARED STATE
 * ==================
 * Mutable shared state for UI modules.
 * Using object properties to avoid ES module read-only binding issues.
 *
 * Anti-monolith: All mutations go through accessor functions below.
 * External modules MUST NOT directly assign to panelState properties.
 */

export const panelState = {
  isOpen: false,
  isLoggedIn: null,
  status: 'idle',
  activeTab: null,
  vacancies: [],
  stats: {},
  resume: null,
  resumeList: [],
  myResumes: [],
  negotiations: [],
  activeConversation: null,
  settings: {
    dailyLimit: 200,
    hourlyLimit: 30,
    minInterval: 30,
    burstDetection: true,
    adaptiveSlowdown: true,
    captchaAutoPause: true,
    captchaPauseTime: 5,
    dailyResetTime: '00:00',
    autoAuthCheck: true,
    notifications: true,
    logging: true,
    shadowDOM: true
  },
  logs: [],
  dailyStats: {
    totalApplied: 0,
    invitations: 0,
    errors429: 0,
  },
  _resumeCleared: false,
  blacklist: [],
  massApply: {
    running: false,
    minMatch: 70,
    maxApply: 20,
    progress: 0
  }
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

// ═══════════════════════════════════════════════
// ACCESSOR FUNCTIONS — centralized state mutations
// ═══════════════════════════════════════════════

/** Set the active resume and mark it as not cleared. */
export function setActiveResumeState(resume) {
  panelState.resume = resume;
  panelState._resumeCleared = false;
}

/** Clear resume data: null resume, mark cleared, empty resume list. */
export function clearResumeState() {
  panelState.resume = null;
  panelState._resumeCleared = true;
  panelState.resumeList = [];
}

/** Set myResumes list. */
export function setMyResumes(list) {
  panelState.myResumes = list;
}

/** Set resumeList. */
export function setResumeList(list) {
  panelState.resumeList = list;
}

/** Set authentication state. */
export function setAuthState(val) {
  panelState.isLoggedIn = val;
}

/** Toggle panel open/close. */
export function togglePanelOpen() {
  panelState.isOpen = !panelState.isOpen;
}

/** Set vacancies list (filtered). */
export function setVacancies(vacancies) {
  panelState.vacancies = (vacancies || []).filter(v => v && v.id && v.title);
}

/** Set engine status. */
export function setStatus(status) {
  panelState.status = status;
}

/** Set active tab. */
export function setActiveTab(tabId) {
  panelState.activeTab = tabId;
}

/** Set active conversation. */
export function setActiveConversation(convId) {
  panelState.activeConversation = convId;
}

/** Remove a company from the blacklist by name. */
export function removeFromBlacklist(name) {
  panelState.blacklist = panelState.blacklist.filter(n => n !== name);
}

/** Merge stats object into panelState.stats. */
export function updateStats(stats) {
  Object.assign(panelState.stats, stats);
}

/** Merge settings object into panelState.settings. */
export function updateSettings(settings) {
  Object.assign(panelState.settings, settings);
}
