/**
 * UI: PANEL -- COVER LETTER EVENTS (F5.6)
 * =========================================
 * Loads the saved cover letter template + tone from storage and populates
 * the #cover-letter-text textarea and #s-letter-tone select in the
 * Negotiations tab. On input -- debounced save. On tone change -- immediate save.
 *
 * Why a separate module: cover-letter-storage.js (F3.2) already has the
 * storage wrappers. This module wires them to the DOM. Keeping it separate
 * avoids bloating tabs/negotiations.js (already 237 lines) and panel/events.js
 * (already 185 lines).
 *
 * Anti-hallucination:
 *   - Missing chrome.storage -> defaults applied, never throws
 *   - Empty template in storage -> formal default template used
 *   - Invalid tone -> 'formal' (validateTone handles)
 *   - No DOM element -> no-op (silent)
 *
 * v1.9.48.0
 */

import { refs } from '../state.js';
import {
  getCoverLetterConfig,
  setCoverLetterTemplate,
  setLetterTone,
} from '../../lib/cover-letter-storage.js';
import { TONES, validateTone, getTemplateForTone, _internal as TONE_INTERNAL } from '../../lib/cover-letter-tone.js';

const DEBOUNCE_MS = 500;

/**
 * Load template + tone from storage and populate the DOM fields.
 * Called once when Negotiations tab is rendered.
 * @param {Object} [opts] -- { storageImpl } for tests
 * @returns {Promise<boolean>} -- true if populated successfully
 */
export async function populateCoverLetterFields(opts) {
  const sr = refs.shadowRoot;
  if (!sr) return false;

  const storage = (opts && opts.storageImpl) || null;
  let config;
  try {
    config = storage
      ? await storage.getCoverLetterConfig()
      : await getCoverLetterConfig();
  } catch (_e) {
    config = { template: '', tone: 'formal' };
  }

  // Populate template textarea (only if storage has a value; otherwise leave
  // the hardcoded HTML default intact to avoid clobbering it)
  const tmplEl = sr.getElementById('cover-letter-text');
  if (tmplEl && config.template) {
    tmplEl.value = config.template;
  }

  // Populate tone select
  const toneEl = sr.getElementById('s-letter-tone');
  if (toneEl) {
    toneEl.value = validateTone(config.tone);
  }

  return true;
}

/**
 * Save the current textarea content to storage (debounced).
 * @param {Object} [opts] -- { storageImpl, debounceMs }
 * @returns {Function} -- cancel function (clears pending save)
 */
export function bindCoverLetterTemplateSave(opts) {
  const sr = refs.shadowRoot;
  if (!sr) return () => {};
  const storage = (opts && opts.storageImpl) || null;
  const debounceMs = (opts && opts.debounceMs) || DEBOUNCE_MS;

  const tmplEl = sr.getElementById('cover-letter-text');
  if (!tmplEl) return () => {};

  let timer = null;

  const onSave = () => {
    const text = tmplEl.value || '';
    if (storage) {
      storage.setCoverLetterTemplate(text).catch(() => {});
    } else {
      setCoverLetterTemplate(text).catch(() => {});
    }
  };

  tmplEl.addEventListener('input', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onSave();
    }, debounceMs);
  });

  return function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/**
 * Bind tone select change handler. On change -- save tone to storage.
 * @param {Element} container -- the panel container
 * @param {Object} [opts] -- { storageImpl }
 */
export function bindLetterToneHandler(container, opts) {
  if (!container) return;
  const storage = (opts && opts.storageImpl) || null;
  const toneEl = container.querySelector('#s-letter-tone');
  if (!toneEl) return;

  toneEl.addEventListener('change', () => {
    const tone = validateTone(toneEl.value);
    // Reflect validated value back to DOM
    toneEl.value = tone;

    // Smart template swap: if the current textarea value matches one of the
    // 4 default templates (i.e., user has NOT manually edited it), swap it to
    // the default template for the newly selected tone. If user has edited
    // the template, leave it alone -- tone only affects AI generation then.
    const tmplEl = container.querySelector('#cover-letter-text') || (refs.shadowRoot && refs.shadowRoot.getElementById('cover-letter-text'));
    if (tmplEl) {
      const currentText = tmplEl.value.trim();
      const allDefaults = Object.values(TONE_INTERNAL.TEMPLATES).map(t => t.trim());
      if (allDefaults.includes(currentText)) {
        const newTemplate = getTemplateForTone(tone);
        tmplEl.value = newTemplate;
        // Persist the swapped template too
        if (storage) {
          storage.setCoverLetterTemplate(newTemplate).catch(() => {});
        } else {
          setCoverLetterTemplate(newTemplate).catch(() => {});
        }
      }
    }

    if (storage) {
      storage.setLetterTone(tone).catch(() => {});
    } else {
      setLetterTone(tone).catch(() => {});
    }
  });
}

/**
 * Convenience: bind both template save + tone change handlers.
 * Called once from panel/events.js bindAllEvents().
 * @param {Element} container
 * @param {Object} [opts]
 */
export function bindCoverLetterEvents(container, opts) {
  bindCoverLetterTemplateSave(opts);
  bindLetterToneHandler(container, opts);
}

/** Exported for tests. */
export const _internal = {
  DEBOUNCE_MS,
  TONES,
};
