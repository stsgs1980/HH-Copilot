/**
 * UI: COVER LETTER AI STATUS + TOAST (F-CR-02)
 * ===============================================
 * Visible context line + toast for the AI button.
 * Extracted from cover-letter-events.js for AHG Rule 12 (anti-monolith).
 *
 * v1.9.51.0
 */

import { refs } from '../state.js';
import { panelState } from '../state.js';

/**
 * Build the context string for #cl-ai-status.
 * @param {Object} ctx -- { vacancy, resume }
 * @returns {string}
 */
export function buildAiStatusText(ctx) {
  const parts = [];
  if (ctx && ctx.vacancy) {
    const v = ctx.vacancy;
    parts.push('Вакансия: ' + (v.title || '?') + (v.company ? ' @ ' + v.company : ''));
  } else {
    parts.push('Вакансия: не выбрана (открой hh.ru/vacancy/* или выбери в списке)');
  }
  if (ctx && ctx.resume) {
    parts.push('Резюме: ' + (ctx.resume.title || ctx.resume.position || '?'));
  } else {
    parts.push('Резюме: не выбрано (загрузи на вкладке "Резюме")');
  }
  return 'Контекст: ' + parts.join(' | ');
}

/**
 * Update the #cl-ai-status line with current context info.
 * Shows what vacancy + resume the AI button will use.
 * @param {Object} ctx -- { vacancy, resume }
 */
export function updateAiStatus(ctx) {
  const sr = refs.shadowRoot;
  if (!sr) return;
  const status = sr.getElementById('cl-ai-status');
  if (!status) return;
  status.textContent = buildAiStatusText(ctx);
}

/**
 * Compute current context from window + panelState.
 * @returns {{ vacancy: Object|null, resume: Object|null }}
 */
export function getCurrentAiContext() {
  return {
    vacancy: (typeof window !== 'undefined' && window.__hhVacDetail) ||
              (panelState.vacancies && panelState.vacancies[0]) ||
              null,
    resume: panelState.resume || null,
  };
}

/**
 * Refresh #cl-ai-status from current window/panelState.
 */
export function refreshAiStatus() {
  updateAiStatus(getCurrentAiContext());
}

/**
 * Show visible toast in #cl-ai-toast (or fallback to console).
 * @param {string} msg
 * @param {'info'|'error'|'success'} kind
 */
export function showAiToast(msg, kind) {
  const sr = refs.shadowRoot;
  if (!sr) {
    try { console.log('[CoverLetterAI]', msg); } catch (_e) { /* ignore */ }
    return;
  }
  const toast = sr.getElementById('cl-ai-toast');
  if (!toast) {
    try { console.log('[CoverLetterAI]', msg); } catch (_e) { /* ignore */ }
    return;
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  if (kind === 'error') {
    toast.style.background = '#FEF2F2';
    toast.style.color = '#DC2626';
    toast.style.border = '1px solid #FECACA';
  } else if (kind === 'success') {
    toast.style.background = '#F0FDF4';
    toast.style.color = '#15803D';
    toast.style.border = '1px solid #BBF7D0';
  } else {
    toast.style.background = '#FFFBEB';
    toast.style.color = '#92400E';
    toast.style.border = '1px solid #FDE68A';
  }
  // Auto-hide after 6s
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 6000);
}

/**
 * Build a helpful error message for a failed AI result.
 * @param {Object} result -- { ok:false, code, error, aiCode }
 * @returns {string}
 */
export function buildAiErrorMessage(result) {
  const code = (result && result.code) || 'unknown';
  const err = (result && result.error) || '';
  const aiCode = (result && result.aiCode) ? ' [' + result.aiCode + ']' : '';
  const msg = 'AI error: ' + code + aiCode + (err ? ' - ' + err : '') +
              (code === 'NO_API_KEY' ? '. Открой Настройки -> AI API key.' : '') +
              (code === 'NO_EVIDENCE' ? '. Вакансия и резюме не имеют общих навыков. Проверь, что в резюме заполнен блок "Навыки" (вкладка Резюме -> загрузить).' : '') +
              (code === 'AI_ERROR' && aiCode === ' [TIMEOUT]' ? '. Увеличь Timeout (мс) в Настройки -> AI-настройки (до 90 000-120 000).' : '');
  return msg;
}

/**
 * Build "missing context" message for the case when vacancy or resume is null.
 * @param {Object} ctx -- { vacancy, resume }
 * @returns {string}
 */
export function buildMissingContextMessage(ctx) {
  const missing = [];
  if (!ctx.vacancy) missing.push('вакансия');
  if (!ctx.resume) missing.push('резюме');
  return 'Не хватает: ' + missing.join(', ') + '. ' +
         (ctx.vacancy ? '' : 'Открой hh.ru/vacancy/* или выбери в списке. ') +
         (ctx.resume ? '' : 'Загрузи резюме на вкладке "Резюме".');
}

/**
 * Build success toast message.
 * @param {string} text -- generated letter
 * @param {Array} warnings -- validator warnings
 * @returns {string}
 */
export function buildSuccessMessage(text, warnings) {
  const len = (text || '').length;
  const warnCount = (Array.isArray(warnings) && warnings.length > 0) ? warnings.length : 0;
  return 'Письмо сгенерировано (' + len + ' символов)' +
         (warnCount > 0 ? ', ' + warnCount + ' предупреждений валидатора' : '');
}
