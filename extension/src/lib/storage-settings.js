/**
 * LIB: STORAGE -- Settings & Stats
 * ================================
 * chrome.storage.local wrappers for settings and statistics.
 * Split from storage.js for anti-monolith compliance.
 */

// ===============================================
// DEFAULTS
// ===============================================

export const DEFAULT_SETTINGS = {
  mode: 'manual', dailyLimit: 200, minMatchScore: 60,
  letterTone: 'formal', searchInterval: 300,
  autoScroll: true, showMatchScore: true, confirmBeforeApply: true
};

export const DEFAULT_STATS = {
  totalApplied: 0, appliedToday: 0, interviewInvites: 0,
  responsesReceived: 0, skipsToday: 0, errorsToday: 0, lastActivity: null
};

// ===============================================
// SETTINGS
// ===============================================

export async function getAllSettings() {
  try {
    const d = await chrome.storage.local.get('settings');
    return Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
  } catch (_e) { return Object.assign({}, DEFAULT_SETTINGS); }
}

// ===============================================
// STATS
// ===============================================

export async function getStats() {
  try {
    await checkDailyReset();
    const d = await chrome.storage.local.get('stats');
    return Object.assign({}, DEFAULT_STATS, d.stats || {});
  } catch (_e) { return Object.assign({}, DEFAULT_STATS); }
}

export async function incrementApplied() {
  const stats = await getStats();
  const settings = await getAllSettings();
  if (stats.appliedToday >= settings.dailyLimit) return { allowed: false, remaining: 0 };
  stats.appliedToday++;
  stats.totalApplied++;
  stats.lastActivity = new Date().toISOString();
  await chrome.storage.local.set({ stats });
  return { allowed: true, remaining: settings.dailyLimit - stats.appliedToday };
}

// ===============================================
// DAILY RESET
// ===============================================

export async function checkDailyReset() {
  try {
    const d = await chrome.storage.local.get('dailyResetDate');
    const today = new Date().toISOString().split('T')[0];
    if (d.dailyResetDate !== today) {
      const sd = await chrome.storage.local.get('stats');
      const s = sd.stats || DEFAULT_STATS;
      s.appliedToday = 0; s.skipsToday = 0; s.errorsToday = 0;
      await chrome.storage.local.set({ stats: s, dailyResetDate: today });
    }
  } catch (_e) {}
}
