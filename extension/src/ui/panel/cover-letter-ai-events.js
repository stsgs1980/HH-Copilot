/**
 * UI: PANEL -- COVER LETTER AI EVENTS (F-CR-02)
 * ===============================================
 * Binds AI button click handler and Copy/Clear log buttons.
 * Split from cover-letter-events.js for Rule 12 (anti-monolith).
 *
 * Anti-hallucination: missing context -> toast + return; no DOM -> no-op.
 *
 * v1.9.61.0
 */

import { refs } from '../state.js';
import {
  updateAiStatus,
  showAiToast,
  refreshAiStatus,
  getCurrentAiContext,
  buildAiErrorMessage,
  buildMissingContextMessage,
  buildSuccessMessage,
} from './cover-letter-ai-ui.js';
import { aiBtnLog, getAiBtnLogText, clearAiBtnLog } from './ai-btn-logger.js';
import { validateTone } from '../../lib/cover-letter-tone.js';

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
        console.log('--- [AI-BTN] full log dump ---\n' + getAiBtnLogText() + '\n--- end dump ---');
      } catch (_e) { /* ignore */ }
    }
  });
}

/**
 * Bind "Copy log" + "Clear log" buttons.
 * Copy: writes full [AI-BTN] log text to clipboard.
 * Clear: empties in-memory log buffer + window array.
 * @param {Object} [opts]
 */
export function bindAiLogButtons(opts) {
  const sr = refs.shadowRoot;
  if (!sr) return;
  const copyBtn = sr.getElementById('cl-ai-log-copy-btn');
  const clearBtn = sr.getElementById('cl-ai-log-clear-btn');
  const statusEl = sr.getElementById('cl-ai-log-status');

  const customToast = opts && opts.toastImpl;

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = getAiBtnLogText();
      const lineCount = text ? text.split('\n').length : 0;
      if (lineCount === 0) {
        if (statusEl) statusEl.textContent = 'лог пуст -- кликни AI сначала';
        if (customToast) customToast('Лог пуст. Сначала кликни <<Сгенерировать с AI>>.');
        else showAiToast('Лог пуст. Сначала кликни <<Сгенерировать с AI>>.', 'error');
        return;
      }
      // Try clipboard API (requires secure context -- hh.ru is https, OK)
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (_e) { /* fall through to fallback */ }
      // Fallback: hidden textarea + execCommand
      if (!copied) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          ta.style.top = '0';
          (sr.host ? sr.host.parentElement : document.body).appendChild(ta);
          ta.focus();
          ta.select();
          copied = document.execCommand('copy');
          ta.remove();
        } catch (_e) { /* ignore */ }
      }
      if (copied) {
        if (statusEl) statusEl.textContent = 'скопировано ' + lineCount + ' строк (ok)';
        if (customToast) customToast('Лог скопирован (' + lineCount + ' строк). Вставь в чат с разработчиком.');
        else showAiToast('Лог скопирован (' + lineCount + ' строк). Вставь в чат с разработчиком.', 'success');
      } else {
        // Last resort: dump to console and instruct to copy manually
        try {
          console.log('--- [AI-BTN] copy-fallback dump ---\n' + text + '\n--- end dump ---');
        } catch (_e) { /* ignore */ }
        if (statusEl) statusEl.textContent = 'не удалось скопировать -- см. консоль';
        if (customToast) customToast('Не удалось скопировать автоматически. F12 -> Console -> последняя запись -> копируй вручную.');
        else showAiToast('Не удалось скопировать автоматически. F12 -> Console -> последняя запись -> копируй вручную.', 'error');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearAiBtnLog();
      if (statusEl) statusEl.textContent = 'лог очищен';
      if (customToast) customToast('Лог очищен.');
      else showAiToast('Лог очищен.', 'info');
    });
  }
}
