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
import { aiBtnLog, getAiBtnLogText } from './ai-btn-logger.js';

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
    aiBtnLog('click', 'AI button clicked');

    const ctx = getCurrentAiContext();
    const { vacancy, resume } = ctx;
    aiBtnLog('ctx', {
      vacancy: vacancy ? {
        id: vacancy.id || '?',
        title: vacancy.title || '?',
        company: vacancy.company || '?',
        hasDescription: !!(vacancy.description || vacancy.text),
        keySkillsCount: Array.isArray(vacancy.keySkills) ? vacancy.keySkills.length : 0,
      } : null,
      resume: resume ? {
        id: resume.id || '?',
        title: resume.title || resume.position || '?',
        skillsCount: Array.isArray(resume.skills) ? resume.skills.length : 0,
        experienceCount: Array.isArray(resume.experience) ? resume.experience.length : 0,
      } : null,
    });
    updateAiStatus(ctx);

    if (!vacancy || !resume) {
      const msg = buildMissingContextMessage(ctx);
      aiBtnLog('reject-no-ctx', msg);
      if (customToast) customToast(msg);
      else showAiToast(msg, 'error');
      return;
    }

    const toneEl = sr.getElementById('s-letter-tone');
    const tone = toneEl ? validateTone(toneEl.value) : 'formal';
    aiBtnLog('tone', tone);

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = 'Генерация...';
    aiBtnLog('btn-disabled', 'button now shows "Генерация..."');

    const msgStart = Date.now();
    aiBtnLog('send-start', { type: 'ai-cover-letter', tone, t: msgStart });

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'ai-cover-letter',
        vacancy, resume,
        opts: { tone },
      });
      const elapsedMs = Date.now() - msgStart;
      aiBtnLog('send-done', { elapsedMs, ok: !!(result && result.ok), code: result && result.code, aiCode: result && result.aiCode });

      if (result && result.ok) {
        const ta = sr.getElementById('cover-letter-text');
        aiBtnLog('resp-ok', { textLen: (result.text || '').length, warnings: Array.isArray(result.warnings) ? result.warnings.length : 0, hasTextarea: !!ta });
        if (ta) {
          ta.value = result.text;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          aiBtnLog('textarea-updated', 'cover-letter-text populated');
        }
        const msg = buildSuccessMessage(result.text, result.warnings);
        if (customToast) customToast(msg);
        else showAiToast(msg, 'success');
        aiBtnLog('toast-success', msg);
      } else {
        const msg = buildAiErrorMessage(result);
        aiBtnLog('resp-err', { result, msg });
        if (customToast) customToast(msg);
        else showAiToast(msg + ' || F12 -> Console -> filter [AI-BTN] -> copy all lines.', 'error');
      }
    } catch (e) {
      const elapsedMs = Date.now() - msgStart;
      const msg = 'AI error: ' + (e.message || String(e));
      aiBtnLog('exception', { elapsedMs, name: e && e.name, message: e && e.message, stack: e && e.stack ? e.stack.split('\n').slice(0, 5).join(' | ') : '', msg });
      if (customToast) customToast(msg);
      else showAiToast(msg + ' || F12 -> Console -> filter [AI-BTN] -> copy all lines.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
      aiBtnLog('btn-restored', 'button re-enabled');
      // Dump full log text to console as a single block for easy copy
      try {
        // eslint-disable-next-line no-console
        console.log('--- [AI-BTN] full log dump ---\n' + getAiBtnLogText() + '\n--- end dump ---');
      } catch (_e) { /* ignore */ }
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
