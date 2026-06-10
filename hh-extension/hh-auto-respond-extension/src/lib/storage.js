/**
 * LIB: STORAGE
 * ==============
 * chrome.storage.local wrapper for settings, stats, and applied vacancies tracking.
 */

// ═══════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════

export const DEFAULT_SETTINGS = {
  mode: 'manual', dailyLimit: 200, minMatchScore: 60,
  letterTone: 'formal', searchInterval: 300,
  autoScroll: true, showMatchScore: true, confirmBeforeApply: true
};

export const DEFAULT_STATS = {
  totalApplied: 0, appliedToday: 0, interviewInvites: 0,
  responsesReceived: 0, skipsToday: 0, errorsToday: 0, lastActivity: null
};

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════

export async function getAllSettings() {
  try {
    const d = await chrome.storage.local.get('settings');
    return Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
  } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════

export async function getStats() {
  try {
    await checkDailyReset();
    const d = await chrome.storage.local.get('stats');
    return Object.assign({}, DEFAULT_STATS, d.stats || {});
  } catch (e) { return Object.assign({}, DEFAULT_STATS); }
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

// ═══════════════════════════════════════════════
// APPLIED VACANCIES TRACKING
// ═══════════════════════════════════════════════

export async function isAlreadyApplied(id) {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    return (d.appliedVacancies || []).includes(id);
  } catch (e) { return false; }
}

export async function markAsApplied(id) {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    const arr = d.appliedVacancies || [];
    if (!arr.includes(id)) { arr.push(id); await chrome.storage.local.set({ appliedVacancies: arr }); }
  } catch (e) {}
}

// ═══════════════════════════════════════════════
// MY RESUMES (multiple)
// ═══════════════════════════════════════════════

export async function getMyResumes() {
  try {
    const d = await chrome.storage.local.get('myResumes');
    return d.myResumes || [];
  } catch (e) { return []; }
}

export async function saveMyResume(resume) {
  if (!resume || !resume.id) return;
  const resumes = await getMyResumes();
  const idx = resumes.findIndex(r => r.id === resume.id);
  if (idx >= 0) {
    resumes[idx] = resume;
  } else {
    resumes.push(resume);
  }
  await chrome.storage.local.set({ myResumes: resumes });
  return resumes;
}

export async function clearMyResumes() {
  await chrome.storage.local.set({ myResumes: [] });
}

// ═══════════════════════════════════════════════
// RESUME SYNC QUEUE
// ═══════════════════════════════════════════════

export async function getSyncQueue() {
  try {
    const d = await chrome.storage.local.get('syncQueue');
    return d.syncQueue || [];
  } catch (e) { return []; }
}

export async function setSyncQueue(queue) {
  await chrome.storage.local.set({ syncQueue: queue });
}

export async function dequeueSyncItem() {
  const queue = await getSyncQueue();
  if (queue.length === 0) return null;
  const next = queue[0];
  await setSyncQueue(queue.slice(1));
  return next;
}

export async function clearSyncQueue() {
  await chrome.storage.local.remove('syncQueue');
}

// ═══════════════════════════════════════════════
// DAILY RESET
// ═══════════════════════════════════════════════

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
  } catch (e) {}
}
