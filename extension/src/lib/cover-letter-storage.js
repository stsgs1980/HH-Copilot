/**
 * LIB: COVER LETTER STORAGE (F3.2)
 * =========================================
 * Storage wrappers for cover letter template + tone.
 *
 * Public API:
 *   - getCoverLetterTemplate() -- read from chrome.storage.local.settings.coverLetterTemplate
 *   - setCoverLetterTemplate(text) -- save to storage
 *   - getLetterTone() -- read from chrome.storage.local.settings.letterTone
 *   - setLetterTone(tone) -- save to storage (validated)
 *
 * Anti-hallucination:
 *   - All functions return defaults on error, never throw
 *   - Tone is validated via validateTone() before persisting
 *   - Empty template string -> DEFAULT_TEMPLATE returned
 *
 * v1.9.46.0
 */

import { getAllSettings } from './storage-settings.js';
import { validateTone, getTemplateForTone } from './cover-letter-tone.js';

const STORAGE_KEY = 'settings';

/** Read current settings object (with defaults applied). */
async function readSettings() {
  try {
    return await getAllSettings();
  } catch (_e) {
    return {};
  }
}

/** Write partial settings update (merges with existing). */
async function writeSettings(partial) {
  try {
    const current = await getAllSettings();
    const next = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  } catch (_e) {
    return null;
  }
}

/**
 * Get the user's saved cover letter template.
 * Returns DEFAULT_TEMPLATE_FORMAL if none saved.
 * @returns {Promise<string>}
 */
export async function getCoverLetterTemplate() {
  const settings = await readSettings();
  const tmpl = settings.coverLetterTemplate;
  if (typeof tmpl === 'string' && tmpl.trim().length > 0) {
    return tmpl;
  }
  return getTemplateForTone('formal');
}

/**
 * Save the user's cover letter template.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function setCoverLetterTemplate(text) {
  if (typeof text !== 'string') return false;
  const result = await writeSettings({ coverLetterTemplate: text });
  return result !== null;
}

/**
 * Get the user's saved letter tone.
 * Returns 'formal' if none saved or invalid.
 * @returns {Promise<string>}
 */
export async function getLetterTone() {
  const settings = await readSettings();
  return validateTone(settings.letterTone);
}

/**
 * Save the user's letter tone.
 * @param {string} tone
 * @returns {Promise<boolean>}
 */
export async function setLetterTone(tone) {
  const valid = validateTone(tone);
  const result = await writeSettings({ letterTone: valid });
  return result !== null;
}

/**
 * Get both template and tone in one call (saves a storage round-trip).
 * @returns {Promise<{template:string, tone:string}>}
 */
export async function getCoverLetterConfig() {
  const settings = await readSettings();
  const tone = validateTone(settings.letterTone);
  const tmpl = (typeof settings.coverLetterTemplate === 'string' &&
                settings.coverLetterTemplate.trim().length > 0)
    ? settings.coverLetterTemplate
    : getTemplateForTone(tone);
  return { template: tmpl, tone };
}
