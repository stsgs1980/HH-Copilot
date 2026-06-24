/**
 * TESTS: cover-letter-ai-ui helpers (F-CR-02 fix v1.9.51.0)
 * Covers:
 *   - buildAiStatusText: vacancy/resume present + missing cases
 *   - buildMissingContextMessage: lists missing pieces
 *   - buildAiErrorMessage: known codes (NO_API_KEY, NO_EVIDENCE, unknown)
 *   - buildSuccessMessage: with + without warnings
 *   - updateAiStatus: writes to #cl-ai-status
 *   - showAiToast: writes to #cl-ai-toast with kind-specific styles
 *   - getCurrentAiContext: reads window.__hhVacDetail + panelState
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildAiStatusText,
  buildMissingContextMessage,
  buildAiErrorMessage,
  buildSuccessMessage,
  updateAiStatus,
  showAiToast,
  getCurrentAiContext,
  refreshAiStatus,
} from '../src/ui/panel/cover-letter-ai-ui.js';
import { refs, panelState } from '../src/ui/state.js';

// ===============================================
// helpers
// ===============================================

function makeShadowRootWithEls() {
  const root = document.createElement('div');
  root.innerHTML = '<div id="cl-ai-status"></div><div id="cl-ai-toast" style="display:none;"></div>';
  // Stub getElementById to search within root
  return {
    getElementById(id) { return root.querySelector('#' + id); },
    querySelector(sel) { return root.querySelector(sel); },
    querySelectorAll(sel) { return root.querySelectorAll(sel); },
    _root: root,
  };
}

beforeEach(() => {
  refs.shadowRoot = makeShadowRootWithEls();
  panelState.resume = null;
  panelState.vacancies = [];
  if (typeof window !== 'undefined') {
    delete window.__hhVacDetail;
  }
});

afterEach(() => {
  refs.shadowRoot = null;
  if (typeof window !== 'undefined') {
    delete window.__hhVacDetail;
  }
});

// ===============================================
// buildAiStatusText
// ===============================================

describe('buildAiStatusText', () => {
  it('returns "not chosen" hints when both null', () => {
    const text = buildAiStatusText({ vacancy: null, resume: null });
    expect(text).toContain('Вакансия: не выбрана');
    expect(text).toContain('Резюме: не выбрано');
  });

  it('includes vacancy title and company when present', () => {
    const text = buildAiStatusText({
      vacancy: { title: 'ROP', company: 'BaseTrade' },
      resume: null,
    });
    expect(text).toContain('Вакансия: ROP @ BaseTrade');
    expect(text).toContain('Резюме: не выбрано');
  });

  it('includes resume title when present', () => {
    const text = buildAiStatusText({
      vacancy: { title: 'ROP', company: 'BaseTrade' },
      resume: { title: 'ROP resume 2024' },
    });
    expect(text).toContain('Резюме: ROP resume 2024');
  });

  it('falls back to position if title missing', () => {
    const text = buildAiStatusText({
      vacancy: null,
      resume: { position: 'Sales Manager' },
    });
    expect(text).toContain('Резюме: Sales Manager');
  });

  it('handles null ctx entirely', () => {
    const text = buildAiStatusText(null);
    expect(text).toContain('Вакансия: не выбрана');
    expect(text).toContain('Резюме: не выбрано');
  });
});

// ===============================================
// buildMissingContextMessage
// ===============================================

describe('buildMissingContextMessage', () => {
  it('lists both missing when both null', () => {
    const msg = buildMissingContextMessage({ vacancy: null, resume: null });
    expect(msg).toContain('вакансия');
    expect(msg).toContain('резюме');
    expect(msg).toContain('Открой hh.ru/vacancy/*');
    expect(msg).toContain('Загрузи резюме');
  });

  it('only mentions vacancy when resume present', () => {
    const msg = buildMissingContextMessage({ vacancy: null, resume: { title: 'X' } });
    expect(msg).toContain('вакансия');
    expect(msg).not.toContain('резюме');
    expect(msg).toContain('Открой hh.ru/vacancy/*');
  });

  it('only mentions resume when vacancy present', () => {
    const msg = buildMissingContextMessage({ vacancy: { title: 'X' }, resume: null });
    expect(msg).not.toContain('вакансия');
    expect(msg).toContain('резюме');
    expect(msg).toContain('Загрузи резюме');
  });
});

// ===============================================
// buildAiErrorMessage
// ===============================================

describe('buildAiErrorMessage', () => {
  it('handles NO_API_KEY with hint', () => {
    const msg = buildAiErrorMessage({ ok: false, code: 'NO_API_KEY', error: 'no key' });
    expect(msg).toContain('NO_API_KEY');
    expect(msg).toContain('Настройки -> AI API key');
  });

  it('handles NO_EVIDENCE with hint', () => {
    const msg = buildAiErrorMessage({ ok: false, code: 'NO_EVIDENCE', error: 'empty' });
    expect(msg).toContain('NO_EVIDENCE');
    expect(msg).toContain('совпадающих навыков');
  });

  it('handles unknown code without hints', () => {
    const msg = buildAiErrorMessage({ ok: false, code: 'HTTP_500', error: 'server' });
    expect(msg).toContain('HTTP_500');
    expect(msg).toContain('server');
    expect(msg).not.toContain('Настройки');
  });

  it('handles missing result (null/undefined)', () => {
    const msg = buildAiErrorMessage(null);
    expect(msg).toContain('unknown');
  });

  it('includes aiCode in brackets when present', () => {
    const msg = buildAiErrorMessage({ ok: false, code: 'AI_ERROR', aiCode: 'TIMEOUT', error: 'timed out' });
    expect(msg).toContain('[TIMEOUT]');
  });
});

// ===============================================
// buildSuccessMessage
// ===============================================

describe('buildSuccessMessage', () => {
  it('reports character count', () => {
    const msg = buildSuccessMessage('Hello, world!', []);
    expect(msg).toContain('13 символов');
  });

  it('reports warning count when > 0', () => {
    const msg = buildSuccessMessage('abc', ['warn1', 'warn2']);
    expect(msg).toContain('2 предупреждений');
  });

  it('omits warnings section when 0', () => {
    const msg = buildSuccessMessage('abc', []);
    expect(msg).not.toContain('предупреждений');
  });

  it('handles undefined warnings array', () => {
    const msg = buildSuccessMessage('abc');
    expect(msg).toContain('3 символов');
  });
});

// ===============================================
// updateAiStatus (DOM)
// ===============================================

describe('updateAiStatus', () => {
  it('writes status text to #cl-ai-status', () => {
    updateAiStatus({ vacancy: { title: 'X', company: 'Y' }, resume: { title: 'Z' } });
    const status = refs.shadowRoot.getElementById('cl-ai-status');
    expect(status.textContent).toContain('X @ Y');
    expect(status.textContent).toContain('Z');
  });

  it('no-op when shadowRoot is null', () => {
    refs.shadowRoot = null;
    expect(() => updateAiStatus({})).not.toThrow();
  });
});

// ===============================================
// showAiToast (DOM)
// ===============================================

describe('showAiToast', () => {
  it('writes message and shows element', () => {
    showAiToast('hello', 'error');
    const toast = refs.shadowRoot.getElementById('cl-ai-toast');
    expect(toast.style.display).toBe('block');
    expect(toast.textContent).toBe('hello');
    expect(toast.style.background).toBe('rgb(254, 242, 242)'); // #FEF2F2
  });

  it('applies success styles', () => {
    showAiToast('ok', 'success');
    const toast = refs.shadowRoot.getElementById('cl-ai-toast');
    expect(toast.style.background).toBe('rgb(240, 253, 244)'); // #F0FDF4
  });

  it('applies info styles for unknown kind', () => {
    showAiToast('info', 'info');
    const toast = refs.shadowRoot.getElementById('cl-ai-toast');
    expect(toast.style.background).toBe('rgb(255, 251, 235)'); // #FFFBEB
  });

  it('falls back to console.log when shadowRoot null', () => {
    refs.shadowRoot = null;
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    showAiToast('test', 'error');
    expect(spy).toHaveBeenCalledWith('[CoverLetterAI]', 'test');
    spy.mockRestore();
  });
});

// ===============================================
// getCurrentAiContext
// ===============================================

describe('getCurrentAiContext', () => {
  it('returns nulls when nothing loaded', () => {
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy).toBeNull();
    expect(ctx.resume).toBeNull();
  });

  it('picks up window.__hhVacDetail', () => {
    window.__hhVacDetail = { id: '123', title: 'V', company: 'C' };
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy).toEqual({ id: '123', title: 'V', company: 'C' });
    delete window.__hhVacDetail;
  });

  it('picks up panelState.resume', () => {
    panelState.resume = { id: 'r1', title: 'My resume' };
    const ctx = getCurrentAiContext();
    expect(ctx.resume).toEqual({ id: 'r1', title: 'My resume' });
  });

  it('prefers window.__hhVacDetail over panelState.vacancies[0]', () => {
    window.__hhVacDetail = { id: 'detail', title: 'FromDetail' };
    panelState.vacancies = [{ id: 'list', title: 'FromList' }];
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy.title).toBe('FromDetail');
    delete window.__hhVacDetail;
  });

  it('falls back to panelState.vacancies[0] when no detail', () => {
    panelState.vacancies = [{ id: 'list', title: 'FromList' }];
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy.title).toBe('FromList');
  });
});

// ===============================================
// refreshAiStatus
// ===============================================

describe('refreshAiStatus', () => {
  it('updates #cl-ai-status from current context', () => {
    window.__hhVacDetail = { title: 'Live', company: 'C' };
    panelState.resume = { title: 'R' };
    refreshAiStatus();
    const status = refs.shadowRoot.getElementById('cl-ai-status');
    expect(status.textContent).toContain('Live @ C');
    expect(status.textContent).toContain('R');
    delete window.__hhVacDetail;
  });
});
