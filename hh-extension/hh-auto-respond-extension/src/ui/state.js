/**
 * UI: SHARED STATE
 * ==================
 * Mutable shared state for UI modules.
 * Using object properties to avoid ES module read-only binding issues.
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
