/**
 * LIB: STORAGE -- Vacancy Details
 * =================================
 * chrome.storage.local wrappers for parsed vacancy detail data.
 * Split from storage-queue.js for anti-monolith compliance.
 *
 * Storage keys:
 *   'vacancyDetails' -> Map<id, detail> stored as array of {id, detail}
 *   'vacancyScores'  -> Map<id, score> stored as array of {id, score, breakdown, computedAt}
 */

// ===============================================
// VACANCY DETAILS (full parsed data)
// ===============================================

/**
 * Get all stored vacancy details.
 * @returns {Object[]} array of detail objects
 */
export async function getVacancyDetails() {
  try {
    const d = await chrome.storage.local.get('vacancyDetails');
    return d.vacancyDetails || [];
  } catch (e) { return []; }
}

/**
 * Get a single vacancy detail by ID.
 * @param {string} id -- vacancy ID (digits)
 * @returns {Object|null}
 */
export async function getVacancyDetail(id) {
  const details = await getVacancyDetails();
  return details.find(d => d.id === id) || null;
}

/**
 * Save or update a vacancy detail.
 * Merges with existing detail (prefers newer data).
 * @param {Object} detail -- parsed vacancy detail object
 */
export async function saveVacancyDetail(detail) {
  if (!detail || !detail.id) return;
  const details = await getVacancyDetails();
  const idx = details.findIndex(d => d.id === detail.id);
  if (idx >= 0) {
    // Merge: keep the most recent data
    details[idx] = { ...details[idx], ...detail };
  } else {
    details.push(detail);
  }
  // Keep max 200 details (LRU by parsedAt)
  if (details.length > 200) {
    details.sort((a, b) => (b.parsedAt || '').localeCompare(a.parsedAt || ''));
    details.length = 200;
  }
  await chrome.storage.local.set({ vacancyDetails: details });
  return details;
}

/**
 * Remove a vacancy detail by ID.
 */
export async function removeVacancyDetail(id) {
  const details = await getVacancyDetails();
  const filtered = details.filter(d => d.id !== id);
  await chrome.storage.local.set({ vacancyDetails: filtered });
}

/**
 * Clear all vacancy details.
 */
export async function clearVacancyDetails() {
  await chrome.storage.local.set({ vacancyDetails: [] });
}

// ===============================================
// MATCH SCORES (computed match scores)
// ===============================================

/**
 * Get all stored match scores.
 * @returns {Object[]} array of {id, score, breakdown, computedAt}
 */
export async function getVacancyScores() {
  try {
    const d = await chrome.storage.local.get('vacancyScores');
    return d.vacancyScores || [];
  } catch (e) { return []; }
}

/**
 * Save a match score for a vacancy.
 * @param {string} id -- vacancy ID
 * @param {number} score -- total score 0-100
 * @param {Object} breakdown -- { skills, title, salary, experience }
 * @param {Object} details -- { matchingSkills, missingSkills, ... }
 */
export async function saveVacancyScore(id, score, breakdown, details) {
  if (!id) return;
  const scores = await getVacancyScores();
  const idx = scores.findIndex(s => s.id === id);
  const entry = { id, score, breakdown, details, computedAt: new Date().toISOString() };
  if (idx >= 0) {
    scores[idx] = entry;
  } else {
    scores.push(entry);
  }
  // Keep max 500 scores
  if (scores.length > 500) {
    scores.sort((a, b) => (b.computedAt || '').localeCompare(a.computedAt || ''));
    scores.length = 500;
  }
  await chrome.storage.local.set({ vacancyScores: scores });
}

/**
 * Get a match score for a specific vacancy.
 * @param {string} id
 * @returns {Object|null}
 */
export async function getVacancyScore(id) {
  const scores = await getVacancyScores();
  return scores.find(s => s.id === id) || null;
}
