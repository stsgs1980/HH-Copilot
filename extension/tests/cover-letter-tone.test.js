/**
 * TESTS: cover letter tone + storage (F3.2)
 * Covers:
 *   - TONES config + validateTone
 *   - getTemplateForTone: 4 tones return distinct templates
 *   - applyTone: greeting/closing swap, empty input, no-op for already-correct
 *   - storage: getCoverLetterTemplate/setCoverLetterTemplate/getLetterTone/setLetterTone/getCoverLetterConfig
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TONES,
  validateTone,
  getTemplateForTone,
  applyTone,
  _internal,
} from '../src/lib/cover-letter-tone.js';
import {
  getCoverLetterTemplate,
  setCoverLetterTemplate,
  getLetterTone,
  setLetterTone,
  getCoverLetterConfig,
} from '../src/lib/cover-letter-storage.js';

// ===============================================
// chrome.storage.local stub
// ===============================================

let store;

beforeEach(() => {
  store = { settings: { letterTone: 'formal', coverLetterTemplate: '' } };
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(obj) { Object.assign(store, obj); },
      },
    },
  };
});

// ===============================================
// TONE config + validation
// ===============================================

describe('F3.2 -- TONES config', () => {
  it('has exactly 4 tones', () => {
    expect(TONES).toHaveLength(4);
    const ids = TONES.map(t => t.id);
    expect(ids).toEqual(['formal', 'friendly', 'concise', 'enthusiastic']);
  });

  it('each tone has id + label', () => {
    for (const t of TONES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
    }
  });
});

describe('F3.2 -- validateTone', () => {
  it('accepts all 4 valid tones', () => {
    expect(validateTone('formal')).toBe('formal');
    expect(validateTone('friendly')).toBe('friendly');
    expect(validateTone('concise')).toBe('concise');
    expect(validateTone('enthusiastic')).toBe('enthusiastic');
  });

  it('returns formal for unknown tone', () => {
    expect(validateTone('unknown')).toBe('formal');
    expect(validateTone('')).toBe('formal');
  });

  it('returns formal for non-string input', () => {
    expect(validateTone(null)).toBe('formal');
    expect(validateTone(undefined)).toBe('formal');
    expect(validateTone(123)).toBe('formal');
  });
});

// ===============================================
// getTemplateForTone
// ===============================================

describe('F3.2 -- getTemplateForTone', () => {
  it('returns distinct templates for each tone', () => {
    const formal = getTemplateForTone('formal');
    const friendly = getTemplateForTone('friendly');
    const concise = getTemplateForTone('concise');
    const enthusiastic = getTemplateForTone('enthusiastic');
    expect(formal).not.toBe(friendly);
    expect(formal).not.toBe(concise);
    expect(formal).not.toBe(enthusiastic);
    expect(friendly).not.toBe(concise);
  });

  it('all templates contain placeholder syntax', () => {
    for (const t of TONES) {
      const tmpl = getTemplateForTone(t.id);
      expect(tmpl).toContain('{position}');
      expect(tmpl).toContain('{company}');
    }
  });

  it('concise template has no greeting', () => {
    const tmpl = getTemplateForTone('concise');
    expect(tmpl.startsWith('Здравствуйте')).toBe(false);
    expect(tmpl.startsWith('Добрый')).toBe(false);
  });

  it('enthusiastic template contains "Очень рад"', () => {
    const tmpl = getTemplateForTone('enthusiastic');
    expect(tmpl).toContain('Очень рад');
  });

  it('falls back to formal for invalid tone', () => {
    expect(getTemplateForTone('garbage')).toBe(getTemplateForTone('formal'));
  });
});

// ===============================================
// applyTone
// ===============================================

describe('F3.2 -- applyTone', () => {
  it('returns empty string for empty input', () => {
    expect(applyTone('', 'formal')).toBe('');
    expect(applyTone(null, 'friendly')).toBe('');
    expect(applyTone(undefined, 'concise')).toBe('');
  });

  it('swaps formal greeting to friendly', () => {
    const formal = 'Здравствуйте! Меня заинтересовала вакансия X. Буду рад обсудить детали на интервью.';
    const friendly = applyTone(formal, 'friendly');
    expect(friendly.startsWith('Добрый день!')).toBe(true);
    expect(friendly.endsWith('Буду очень рад пообщаться и узнать больше о позиции!')).toBe(true);
  });

  it('swaps to concise (strips greeting + closing)', () => {
    const formal = 'Здравствуйте! Меня заинтересовала вакансия X. Буду рад обсудить детали на интервью.';
    const concise = applyTone(formal, 'concise');
    expect(concise.startsWith('Здравствуйте')).toBe(false);
    expect(concise.endsWith('на интервью.')).toBe(false);
    expect(concise).toContain('вакансия X');
  });

  it('applies enthusiastic greeting + closing', () => {
    const text = 'Здравствуйте! Test body. Буду рад обсудить детали на интервью.';
    const result = applyTone(text, 'enthusiastic');
    expect(result.startsWith('Здравствуйте! Очень рад возможности откликнуться!')).toBe(true);
    expect(result).toContain('Готов начать работу');
  });

  it('does not break {placeholder} syntax', () => {
    const text = 'Здравствуйте! Vacancy {position} at {company}. Буду рад обсудить детали на интервью.';
    const friendly = applyTone(text, 'friendly');
    expect(friendly).toContain('{position}');
    expect(friendly).toContain('{company}');
  });

  it('handles text without known greeting/closing (prepending only)', () => {
    const text = 'Just a body without greeting or closing.';
    const result = applyTone(text, 'friendly');
    expect(result.startsWith('Добрый день!')).toBe(true);
    expect(result.endsWith('Буду очень рад пообщаться и узнать больше о позиции!')).toBe(true);
    expect(result).toContain('Just a body');
  });

  it('falls back to formal for unknown tone', () => {
    const text = 'Здравствуйте! Body. Буду рад обсудить детали на интервью.';
    expect(applyTone(text, 'garbage')).toBe(text);
  });
});

// ===============================================
// Storage: template + tone
// ===============================================

describe('F3.2 -- storage: getCoverLetterTemplate', () => {
  it('returns DEFAULT when no template saved', async () => {
    store.settings.coverLetterTemplate = '';
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toContain('{position}');
    expect(tmpl).toContain('{company}');
  });

  it('returns user template when saved', async () => {
    store.settings.coverLetterTemplate = 'My custom {position} template.';
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toBe('My custom {position} template.');
  });

  it('returns DEFAULT for whitespace-only template', async () => {
    store.settings.coverLetterTemplate = '   ';
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toContain('{position}');
  });
});

describe('F3.2 -- storage: setCoverLetterTemplate', () => {
  it('saves template to storage', async () => {
    const ok = await setCoverLetterTemplate('My new {position} template.');
    expect(ok).toBe(true);
    expect(store.settings.coverLetterTemplate).toBe('My new {position} template.');
  });

  it('rejects non-string input', async () => {
    const ok = await setCoverLetterTemplate(123);
    expect(ok).toBe(false);
  });
});

describe('F3.2 -- storage: getLetterTone', () => {
  it('returns saved tone', async () => {
    store.settings.letterTone = 'friendly';
    expect(await getLetterTone()).toBe('friendly');
  });

  it('returns formal when tone missing', async () => {
    delete store.settings.letterTone;
    expect(await getLetterTone()).toBe('formal');
  });

  it('returns formal for invalid stored tone', async () => {
    store.settings.letterTone = 'garbage';
    expect(await getLetterTone()).toBe('formal');
  });
});

describe('F3.2 -- storage: setLetterTone', () => {
  it('saves valid tone', async () => {
    const ok = await setLetterTone('enthusiastic');
    expect(ok).toBe(true);
    expect(store.settings.letterTone).toBe('enthusiastic');
  });

  it('normalizes invalid tone to formal before saving', async () => {
    const ok = await setLetterTone('garbage');
    expect(ok).toBe(true);
    expect(store.settings.letterTone).toBe('formal');
  });
});

describe('F3.2 -- storage: getCoverLetterConfig', () => {
  it('returns both template + tone in one call', async () => {
    store.settings.letterTone = 'concise';
    store.settings.coverLetterTemplate = 'Custom {position} template.';
    const cfg = await getCoverLetterConfig();
    expect(cfg.tone).toBe('concise');
    expect(cfg.template).toBe('Custom {position} template.');
  });

  it('uses tone-default template when no custom template saved', async () => {
    store.settings.letterTone = 'friendly';
    store.settings.coverLetterTemplate = '';
    const cfg = await getCoverLetterConfig();
    expect(cfg.tone).toBe('friendly');
    expect(cfg.template).toContain('Добрый день');
  });
});

// ===============================================
// Internal sanity checks
// ===============================================

describe('F3.2 -- internal', () => {
  it('GREETINGS has 4 entries', () => {
    expect(Object.keys(_internal.GREETINGS)).toHaveLength(4);
  });

  it('CLOSINGS has 4 entries', () => {
    expect(Object.keys(_internal.CLOSINGS)).toHaveLength(4);
  });

  it('concise greeting is empty string', () => {
    expect(_internal.GREETINGS.concise).toBe('');
  });
});
