/**
 * UI: PANEL -- COVER LETTER EVENTS (F5.6)
 * =========================================
 * Loads saved cover-letter template + tone from storage, populates DOM.
 * On input -- debounced save. On tone change -- immediate save + smart
 * template swap. Binds AI button (F-CR-02).
 *
 * Anti-hallucination: missing storage -> defaults; invalid tone -> 'formal';
 * no DOM element -> no-op (silent).
 *
 * v1.9.51.0
 */

import { refs } from '../state.js';
import {
  getCoverLetterConfig,
  setCoverLetterTemplate,
  setLetterTone,
} from '../../lib/cover-letter-storage.js';
import { TONES, validateTone, getTemplateForTone, _internal as TONE_INTERNAL } from '../../lib/cover-letter-tone.js';
import {
  updateAiStatus,
  showAiToast,
  refreshAiStatus,
  getCurrentAiContext,
  buildAiErrorMessage,
  buildMissingContextMessage,
  buildSuccessMessage,
} from './cover-letter-ai-ui.js';

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

  // Update AI status line with current context (vacancy + resume)
  refreshAiStatus();

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
    toneEl.value = tone;

    // Smart template swap: if textarea still has a default template, swap it.
    const tmplEl = container.querySelector('#cover-letter-text') || (refs.shadowRoot && refs.shadowRoot.getElementById('cover-letter-text'));
    if (tmplEl) {
      const currentText = tmplEl.value.trim();
      const allDefaults = Object.values(TONE_INTERNAL.TEMPLATES).map(t => t.trim());
      if (allDefaults.includes(currentText)) {
        const newTemplate = getTemplateForTone(tone);
        tmplEl.value = newTemplate;
        if (storage) storage.setCoverLetterTemplate(newTemplate).catch(() => {});
        else setCoverLetterTemplate(newTemplate).catch(() => {});
      }
    }

    if (storage) storage.setLetterTone(tone).catch(() => {});
    else setLetterTone(tone).catch(() => {});
  });
}

/**
 * Bind AI button click handler (F-CR-02).
 * Calls background AI_GENERATE_COVER_LETTER -> fills textarea on success.
 * @param {Object} [opts] -- { toastImpl } for tests
 */
export function bindCoverLetterAIBtn(opts) {
  const sr = refs.shadowRoot;
  if (!sr) return;
  const btn = sr.getElementById('cover-letter-ai-btn');
  if (!btn) return;

  setTimeout(refreshAiStatus, 0);

  if (typeof window !== 'undefined') {
    window.addEventListener('hh-ar-resume-loaded', refreshAiStatus);
    window.addEventListener('hh-ar-match-updated', refreshAiStatus);
  }

  const customToast = opts && opts.toastImpl;

  btn.addEventListener('click', async () => {
    const ctx = getCurrentAiContext();
    const { vacancy, resume } = ctx;
    updateAiStatus(ctx);

    if (!vacancy || !resume) {
      const msg = buildMissingContextMessage(ctx);
      if (customToast) customToast(msg);
      else showAiToast(msg, 'error');
      return;
    }

    const toneEl = sr.getElementById('s-letter-tone');
    const tone = toneEl ? validateTone(toneEl.value) : 'formal';

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = 'Генерация...';

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'ai-cover-letter',
        vacancy, resume,
        opts: { tone },
      });

      if (result && result.ok) {
        const ta = sr.getElementById('cover-letter-text');
        if (ta) {
          ta.value = result.text;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const msg = buildSuccessMessage(result.text, result.warnings);
        if (customToast) customToast(msg);
        else showAiToast(msg, 'success');
      } else {
        const msg = buildAiErrorMessage(result);
        if (customToast) customToast(msg);
        else showAiToast(msg, 'error');
      }
    } catch (e) {
      const msg = 'AI error: ' + (e.message || String(e));
      if (customToast) customToast(msg);
      else showAiToast(msg, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
}

/**
 * Convenience: bind both template save + tone change handlers + AI button.
 * Called once from panel/events.js bindAllEvents().
 * @param {Element} container
 * @param {Object} [opts]
 */
export function bindCoverLetterEvents(container, opts) {
  bindCoverLetterTemplateSave(opts);
  bindLetterToneHandler(container, opts);
  bindCoverLetterAIBtn(opts);
}

/** Exported for tests. */
export const _internal = {
  DEBOUNCE_MS,
  TONES,
};
