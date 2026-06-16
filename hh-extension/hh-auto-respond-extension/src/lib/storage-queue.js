/**
 * LIB: STORAGE -- Resumes & Queue
 * ================================
 * chrome.storage.local wrappers for resume data, apply queue, and blacklist.
 * Split from storage.js for anti-monolith compliance.
 */

// ===============================================
// APPLIED VACANCIES TRACKING
// ===============================================

export async function getAppliedVacancies() {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    return d.appliedVacancies || [];
  } catch (_e) { return []; }
}

export async function isAlreadyApplied(id) {
  const appliedIds = await getAppliedVacancies();
  return appliedIds.includes(id);
}

export async function markAsApplied(id) {
  try {
    const d = await chrome.storage.local.get('appliedVacancies');
    const arr = d.appliedVacancies || [];
    if (!arr.includes(id)) { arr.push(id); await chrome.storage.local.set({ appliedVacancies: arr }); }
  } catch (_e) {}
}

// ===============================================
// MY RESUMES (multiple)
// ===============================================

export async function getMyResumes() {
  try {
    const d = await chrome.storage.local.get('myResumes');
    return d.myResumes || [];
  } catch (_e) { return []; }
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

export async function saveMyResumes(resumes) {
  await chrome.storage.local.set({ myResumes: resumes });
}

export async function clearMyResumes() {
  await chrome.storage.local.set({ myResumes: [] });
}

// ===============================================
// RESUME SYNC QUEUE
// ===============================================

export async function getSyncQueue() {
  try {
    const d = await chrome.storage.local.get('syncQueue');
    return d.syncQueue || [];
  } catch (_e) { return []; }
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

// ===============================================
// ACTIVE RESUME (single)
// ===============================================

export async function getActiveResume() {
  try {
    const d = await chrome.storage.local.get('myResume');
    return d.myResume || null;
  } catch (_e) { return null; }
}

export async function setActiveResume(resume) {
  await chrome.storage.local.set({ myResume: resume });
}

export async function clearActiveResume() {
  await chrome.storage.local.remove('myResume');
}

// ===============================================
// APPLY QUEUE
// ===============================================

export async function getApplyQueue() {
  try {
    const d = await chrome.storage.local.get('applyQueue');
    return d.applyQueue || [];
  } catch (_e) { return []; }
}

export async function setApplyQueue(queue) {
  await chrome.storage.local.set({ applyQueue: queue });
}

// ===============================================
// BLACKLISTED COMPANIES
// ===============================================

export async function getBlacklistedCompanies() {
  try {
    const d = await chrome.storage.local.get('blacklistedCompanies');
    return d.blacklistedCompanies || [];
  } catch (_e) { return []; }
}

export async function setBlacklistedCompanies(list) {
  await chrome.storage.local.set({ blacklistedCompanies: list });
}

export async function addBlacklistedCompany(name) {
  const list = await getBlacklistedCompanies();
  if (!list.includes(name)) {
    list.push(name);
    await setBlacklistedCompanies(list);
  }
}

export async function removeBlacklistedCompany(name) {
  const list = await getBlacklistedCompanies();
  const filtered = list.filter(n => n !== name);
  await setBlacklistedCompanies(filtered);
}
