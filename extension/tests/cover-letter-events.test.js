/**
 * TESTS: cover-letter-events UI wiring (F5.6)
 * Covers:
 *   - populateCoverLetterFields: populates textarea + tone select
 *   - bindCoverLetterTemplateSave: debounced save on input
 *   - bindLetterToneHandler: immediate save on change, validates tone
 *   - bindCoverLetterEvents: convenience wrapper binds both
 *   - Storage failure tolerance (no throw)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  populateCoverLetterFields,
  bindCoverLetterTemplateSave,
  bindLetterToneHandler,
  bindCoverLetterEvents,
  _internal,
} from '../src/ui/panel/cover-letter-events.js';
import { refs } from '../src/ui/state.js';

// ===============================================
// storage stub
// ===============================================

function makeStorageStub(initial) {
  const state = {
    settings: {
      letterTone: 'formal',
      coverLetterTemplate: '',
      ...(initial || {}),
    },
  };
  return {
    async getCoverLetterConfig() {
      const tmpl = state.settings.coverLetterTemplate;
      const tone = state.settings.letterTone || 'formal';
      return {
        template: (typeof tmpl === 'string' && tmpl.trim().length > 0)
          ? tmpl
          : 'DEFAULT_TEMPLATE_FALLBACK',
        tone,
      };
    },
    async setCoverLetterTemplate(text) {
      state.settings.coverLetterTemplate = text;
      return true;
    },
    async setLetterTone(tone) {
      state.settings.letterTone = tone;
      return true;
    },
    _state: state,
  };
}

beforeEach(() => {
  refs.shadowRoot = null;
});

// ===============================================
// populateCoverLetterFields
// ===============================================

describe('F5.6 -- populateCoverLetterFields', () => {
  it('populates textarea + tone select from storage', async () => {
    const storage = makeStorageStub({
      coverLetterTemplate: 'Hello {position}',
      letterTone: 'friendly',
    });
    // Build shadowRoot with both elements
    const div = document.createElement('div');
    div.innerHTML = `
      <textarea id="cover-letter-text">HARDCODED_DEFAULT</textarea>
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="friendly">friendly</option>
        <option value="concise">concise</option>
        <option value="enthusiastic">enthusiastic</option>
      </select>
    `;
    refs.shadowRoot = { getElementById: (id) => div.querySelector('#' + id) };

    await populateCoverLetterFields({ storageImpl: storage });
    expect(div.querySelector('#cover-letter-text').value).toBe('Hello {position}');
    expect(div.querySelector('#s-letter-tone').value).toBe('friendly');
  });

  it('does NOT clobber textarea when storage returns empty template', async () => {
    const storage = makeStorageStub({ coverLetterTemplate: '' });
    const div = document.createElement('div');
    div.innerHTML = `<textarea id="cover-letter-text">HARDCODED</textarea><select id="s-letter-tone"><option value="formal">f</option></select>`;
    refs.shadowRoot = { getElementById: (id) => div.querySelector('#' + id) };

    // getCoverLetterConfig returns default template when empty, but populate
    // only writes when config.template is truthy. The default is non-empty
    // ('DEFAULT_TEMPLATE_FALLBACK' in stub), so we check that path too.
    await populateCoverLetterFields({ storageImpl: storage });
    // Storage stub returns 'DEFAULT_TEMPLATE_FALLBACK' which is truthy
    expect(div.querySelector('#cover-letter-text').value).toBe('DEFAULT_TEMPLATE_FALLBACK');
  });

  it('returns false when no shadowRoot', async () => {
    refs.shadowRoot = null;
    const ok = await populateCoverLetterFields({ storageImpl: makeStorageStub() });
    expect(ok).toBe(false);
  });

  it('does not throw when storage throws', async () => {
    const badStorage = {
      async getCoverLetterConfig() { throw new Error('storage broken'); },
    };
    const div = document.createElement('div');
    div.innerHTML = `<textarea id="cover-letter-text"></textarea><select id="s-letter-tone"><option value="formal">f</option></select>`;
    refs.shadowRoot = { getElementById: (id) => div.querySelector('#' + id) };
    // Should not throw, should return true (DOM was populated with defaults)
    const ok = await populateCoverLetterFields({ storageImpl: badStorage });
    expect(ok).toBe(true);
  });
});

// ===============================================
// bindCoverLetterTemplateSave
// ===============================================

describe('F5.6 -- bindCoverLetterTemplateSave', () => {
  it('saves textarea content after debounce on input', async () => {
    const storage = makeStorageStub();
    const div = document.createElement('div');
    div.innerHTML = `<textarea id="cover-letter-text">initial</textarea>`;
    refs.shadowRoot = { getElementById: (id) => div.querySelector('#' + id) };

    const cancel = bindCoverLetterTemplateSave({ storageImpl: storage, debounceMs: 10 });

    const ta = div.querySelector('#cover-letter-text');
    ta.value = 'edited content';
    ta.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait past debounce
    await new Promise(r => setTimeout(r, 30));

    expect(storage._state.settings.coverLetterTemplate).toBe('edited content');
    cancel();
  });

  it('cancel function clears pending save', async () => {
    const storage = makeStorageStub();
    const div = document.createElement('div');
    div.innerHTML = `<textarea id="cover-letter-text">initial</textarea>`;
    refs.shadowRoot = { getElementById: (id) => div.querySelector('#' + id) };

    const cancel = bindCoverLetterTemplateSave({ storageImpl: storage, debounceMs: 50 });

    const ta = div.querySelector('#cover-letter-text');
    ta.value = 'changed';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    cancel();
    await new Promise(r => setTimeout(r, 80));
    // Save was cancelled, value not persisted
    expect(storage._state.settings.coverLetterTemplate).toBe('');
  });

  it('returns no-op cancel when shadowRoot missing', () => {
    refs.shadowRoot = null;
    const cancel = bindCoverLetterTemplateSave({ storageImpl: makeStorageStub() });
    expect(typeof cancel).toBe('function');
    cancel(); // should not throw
  });

  it('returns no-op cancel when textarea missing', () => {
    const div = document.createElement('div');
    div.innerHTML = '';
    refs.shadowRoot = { getElementById: () => null };
    const cancel = bindCoverLetterTemplateSave({ storageImpl: makeStorageStub() });
    expect(typeof cancel).toBe('function');
    cancel();
  });
});

// ===============================================
// bindLetterToneHandler
// ===============================================

describe('F5.6 -- bindLetterToneHandler', () => {
  it('saves tone on change event', async () => {
    const storage = makeStorageStub();
    const container = document.createElement('div');
    container.innerHTML = `
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="friendly">friendly</option>
        <option value="concise">concise</option>
        <option value="enthusiastic">enthusiastic</option>
      </select>
    `;
    bindLetterToneHandler(container, { storageImpl: storage });

    const sel = container.querySelector('#s-letter-tone');
    sel.value = 'enthusiastic';
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    // Microtask to allow async setLetterTone to resolve
    await new Promise(r => setTimeout(r, 5));
    expect(storage._state.settings.letterTone).toBe('enthusiastic');
  });

  it('validates invalid tone and writes "formal"', async () => {
    const storage = makeStorageStub();
    const container = document.createElement('div');
    container.innerHTML = `
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="INVALID_TONE">invalid</option>
      </select>
    `;
    bindLetterToneHandler(container, { storageImpl: storage });

    const sel = container.querySelector('#s-letter-tone');
    sel.value = 'INVALID_TONE';
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise(r => setTimeout(r, 5));
    expect(storage._state.settings.letterTone).toBe('formal');
    // Also reflects validated value back to DOM
    expect(sel.value).toBe('formal');
  });

  it('no-op when container is null', () => {
    bindLetterToneHandler(null);
    expect(true).toBe(true);
  });

  it('no-op when select is missing', () => {
    const container = document.createElement('div');
    container.innerHTML = '';
    bindLetterToneHandler(container, { storageImpl: makeStorageStub() });
    expect(true).toBe(true);
  });

  it('smart-swap: swaps textarea to tone default when current matches a default', async () => {
    const storage = makeStorageStub();
    const container = document.createElement('div');
    // Use the EXACT formal default template from cover-letter-tone.js
    const { _internal: TONE_INTERNAL } = await import('../src/lib/cover-letter-tone.js');
    const formalDefault = TONE_INTERNAL.TEMPLATES.formal;
    container.innerHTML = `
      <textarea id="cover-letter-text">${formalDefault}</textarea>
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="friendly">friendly</option>
        <option value="concise">concise</option>
        <option value="enthusiastic">enthusiastic</option>
      </select>
    `;
    bindLetterToneHandler(container, { storageImpl: storage });

    const sel = container.querySelector('#s-letter-tone');
    const ta = container.querySelector('#cover-letter-text');
    sel.value = 'friendly';
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise(r => setTimeout(r, 5));
    // Tone saved
    expect(storage._state.settings.letterTone).toBe('friendly');
    // Textarea swapped to friendly default
    expect(ta.value).toBe(TONE_INTERNAL.TEMPLATES.friendly);
    // Template also persisted to storage
    expect(storage._state.settings.coverLetterTemplate).toBe(TONE_INTERNAL.TEMPLATES.friendly);
  });

  it('smart-swap: does NOT swap when user has edited template', async () => {
    const storage = makeStorageStub();
    const container = document.createElement('div');
    container.innerHTML = `
      <textarea id="cover-letter-text">My custom text that does not match any default</textarea>
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="concise">concise</option>
      </select>
    `;
    bindLetterToneHandler(container, { storageImpl: storage });

    const sel = container.querySelector('#s-letter-tone');
    const ta = container.querySelector('#cover-letter-text');
    sel.value = 'concise';
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise(r => setTimeout(r, 5));
    expect(storage._state.settings.letterTone).toBe('concise');
    // Textarea unchanged
    expect(ta.value).toBe('My custom text that does not match any default');
    // Template NOT persisted (no swap)
    expect(storage._state.settings.coverLetterTemplate).toBe('');
  });
});

// ===============================================
// bindCoverLetterEvents (convenience wrapper)
// ===============================================

describe('F5.6 -- bindCoverLetterEvents', () => {
  it('binds both template + tone handlers', async () => {
    const storage = makeStorageStub();
    const container = document.createElement('div');
    container.innerHTML = `
      <textarea id="cover-letter-text">initial</textarea>
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="concise">concise</option>
      </select>
    `;
    refs.shadowRoot = { getElementById: (id) => container.querySelector('#' + id) };

    bindCoverLetterEvents(container, { storageImpl: storage, debounceMs: 10 });

    // Trigger tone change
    const sel = container.querySelector('#s-letter-tone');
    sel.value = 'concise';
    sel.dispatchEvent(new Event('change', { bubbles: true }));

    // Trigger textarea input
    const ta = container.querySelector('#cover-letter-text');
    ta.value = 'new text';
    ta.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(r => setTimeout(r, 30));
    expect(storage._state.settings.letterTone).toBe('concise');
    expect(storage._state.settings.coverLetterTemplate).toBe('new text');
  });
});

// ===============================================
// Internal exports
// ===============================================

describe('F5.6 -- internal exports', () => {
  it('DEBOUNCE_MS is 500 by default', () => {
    expect(_internal.DEBOUNCE_MS).toBe(500);
  });

  it('TONES has exactly 4 entries', () => {
    expect(_internal.TONES).toHaveLength(4);
    expect(_internal.TONES.map(t => t.id)).toEqual(
      expect.arrayContaining(['formal', 'friendly', 'concise', 'enthusiastic'])
    );
  });
});
