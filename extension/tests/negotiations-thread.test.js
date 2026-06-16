/**
 * TESTS: negotiations chat thread parser (F4.3)
 * Covers:
 *   - parseChatThread: user/employer detection, empty cells skipped, no root, multiple selectors
 *   - extractThreadForAI: role mapping, empty filter, non-array input
 *   - buildStarterPrompt: vacancy+company interpolation, empty input
 */

import { describe, it, expect } from 'vitest';
import {
  parseChatThread,
  extractThreadForAI,
  buildStarterPrompt,
  _internal,
} from '../src/parsers/negotiations-thread.js';

// ===============================================
// Helpers: build DOM trees mimicking hh.ru chat
// ===============================================

function makeCell({ text, time, from }) {
  const cell = document.createElement('div');
  cell.setAttribute('data-qa', 'chat-cell-' + Math.random().toString(36).slice(2, 8));

  const textEl = document.createElement('div');
  textEl.setAttribute('data-qa', 'chat-cell-text');
  textEl.textContent = text;
  cell.appendChild(textEl);

  if (time) {
    const timeEl = document.createElement('div');
    timeEl.setAttribute('data-qa', 'chat-cell-creation-time');
    timeEl.textContent = time;
    cell.appendChild(timeEl);
  }

  if (from === 'user') {
    cell.setAttribute('data-qa', cell.getAttribute('data-qa') + '-outgoing');
  }
  return cell;
}

function makeThread(cells) {
  const root = document.createElement('div');
  for (const c of cells) root.appendChild(c);
  return root;
}

// ===============================================
// Tests
// ===============================================

describe('F4.3 -- parseChatThread', () => {
  it('parses user + employer messages with text + time', () => {
    const root = makeThread([
      makeCell({ text: 'Здравствуйте', time: '10:00', from: 'employer' }),
      makeCell({ text: 'Привет', time: '10:01', from: 'user' }),
      makeCell({ text: 'Когда интервью?', time: '10:02', from: 'user' }),
    ]);
    const msgs = parseChatThread(root);
    expect(msgs).toHaveLength(3);
    expect(msgs[0]).toEqual({ from: 'employer', text: 'Здравствуйте', time: '10:00' });
    expect(msgs[1].from).toBe('user');
    expect(msgs[2].text).toBe('Когда интервью?');
  });

  it('skips cells with empty text (anti-ghost)', () => {
    const emptyText = document.createElement('div');
    emptyText.setAttribute('data-qa', 'chat-cell-empty');
    const textEl = document.createElement('div');
    textEl.setAttribute('data-qa', 'chat-cell-text');
    textEl.textContent = '   ';
    emptyText.appendChild(textEl);

    const good = makeCell({ text: 'real message', from: 'employer' });
    const root = makeThread([emptyText, good]);

    const msgs = parseChatThread(root);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('real message');
  });

  it('returns [] when root has no chat cells', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div>some unrelated content</div>';
    expect(parseChatThread(root)).toEqual([]);
  });

  it('returns [] when root is null/undefined', () => {
    expect(parseChatThread(null)).toEqual([]);
    expect(parseChatThread(undefined)).toEqual([]);
  });

  it('handles cell without text element (falls back to cell text)', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'chat-cell-fallback');
    cell.textContent = 'fallback content';
    const root = makeThread([cell]);
    const msgs = parseChatThread(root);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('fallback content');
  });

  it('detects user message by class heuristic when data-qa missing', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'chat-cell-x');
    cell.className = 'msg-outgoing-block';
    const textEl = document.createElement('div');
    textEl.setAttribute('data-qa', 'chat-cell-text');
    textEl.textContent = 'I sent this';
    cell.appendChild(textEl);
    const root = makeThread([cell]);
    const msgs = parseChatThread(root);
    expect(msgs[0].from).toBe('user');
  });

  it('detects user message by data-qa "-out" suffix', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'chat-cell-msg-out');
    const textEl = document.createElement('div');
    textEl.setAttribute('data-qa', 'chat-cell-text');
    textEl.textContent = 'outgoing';
    cell.appendChild(textEl);
    const root = makeThread([cell]);
    expect(parseChatThread(root)[0].from).toBe('user');
  });

  it('handles time via <time> element fallback', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'chat-cell-x');
    const textEl = document.createElement('div');
    textEl.setAttribute('data-qa', 'chat-cell-text');
    textEl.textContent = 'msg';
    cell.appendChild(textEl);
    const timeEl = document.createElement('time');
    timeEl.setAttribute('datetime', '2026-06-17T10:00');
    timeEl.textContent = '10:00';
    cell.appendChild(timeEl);
    const root = makeThread([cell]);
    const msgs = parseChatThread(root);
    expect(msgs[0].time).toBe('10:00');
  });
});

describe('F4.3 -- extractThreadForAI', () => {
  it('maps user -> user, employer -> assistant', () => {
    const msgs = [
      { from: 'employer', text: 'Hi' },
      { from: 'user', text: 'Hello' },
      { from: 'employer', text: 'Send CV' },
    ];
    const ai = extractThreadForAI(msgs);
    expect(ai).toEqual([
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Send CV' },
    ]);
  });

  it('filters out items with empty text', () => {
    const msgs = [
      { from: 'user', text: 'real' },
      { from: 'user', text: '' },
      { from: 'employer', text: null },
      { from: 'user', text: 'also real' },
    ];
    const ai = extractThreadForAI(msgs);
    expect(ai).toHaveLength(2);
    expect(ai[0].content).toBe('real');
    expect(ai[1].content).toBe('also real');
  });

  it('returns [] for non-array input', () => {
    expect(extractThreadForAI(null)).toEqual([]);
    expect(extractThreadForAI(undefined)).toEqual([]);
    expect(extractThreadForAI('not an array')).toEqual([]);
  });

  it('returns [] for empty array', () => {
    expect(extractThreadForAI([])).toEqual([]);
  });
});

describe('F4.3 -- buildStarterPrompt', () => {
  it('builds prompt with vacancy + company', () => {
    const prompt = buildStarterPrompt({ vacancyTitle: 'Frontend Dev', company: 'Acme' });
    expect(prompt).toHaveLength(1);
    expect(prompt[0].role).toBe('user');
    expect(prompt[0].content).toContain('Frontend Dev');
    expect(prompt[0].content).toContain('Acme');
    expect(prompt[0].content).toContain('актуальна');
  });

  it('handles missing fields with fallbacks', () => {
    const prompt = buildStarterPrompt({});
    expect(prompt[0].content).toContain('вакансия');
    expect(prompt[0].content).toContain('компания');
  });

  it('handles null conv', () => {
    const prompt = buildStarterPrompt(null);
    expect(prompt).toHaveLength(1);
    expect(prompt[0].role).toBe('user');
  });
});

describe('F4.3 -- internal helpers', () => {
  it('isUserMessage detects via selector match', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'msg-outgoing');
    expect(_internal.isUserMessage(cell)).toBe(true);
  });

  it('isUserMessage returns false for plain employer cell', () => {
    const cell = document.createElement('div');
    cell.setAttribute('data-qa', 'msg-incoming');
    expect(_internal.isUserMessage(cell)).toBe(false);
  });
});
