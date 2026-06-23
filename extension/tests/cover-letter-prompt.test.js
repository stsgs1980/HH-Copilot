/**
 * TESTS: cover-letter-prompt (F-CR-02)
 * =====================================
 * buildPrompt(scorecard, evidence, tone) -> { messages, estimatedTokens }
 *
 * System prompt contains anti-hallucination rules + 11 banned AI patterns.
 * User prompt includes scorecard mission/outcomes/competencies + evidence list.
 */

import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../src/lib/cover-letter-prompt.js';

const baseScorecard = {
  mission: 'Senior Frontend Developer: Разработка интерфейсов',
  outcomes: ['Разработка UI компонентов', 'Оптимизация производительности'],
  competencies: ['React', 'TypeScript'],
};

const baseEvidence = [
  {
    competency: 'React',
    evidenceText: 'Работал с React, делал UI компоненты.',
    confidence: 'high',
    source: { type: 'experience', index: 0, sentence: 'Работал с React, делал UI компоненты.' },
  },
  {
    competency: 'TypeScript',
    evidenceText: 'Разрабатывал на TypeScript микросервисы.',
    confidence: 'medium',
    source: { type: 'experience', index: 1, sentence: 'Разрабатывал на TypeScript микросервисы.' },
  },
];

describe('F-CR-02 -- buildPrompt', () => {
  it('returns messages array with system + user', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    expect(r).toBeDefined();
    expect(Array.isArray(r.messages)).toBe(true);
    expect(r.messages.length).toBe(2);
    expect(r.messages[0].role).toBe('system');
    expect(r.messages[1].role).toBe('user');
  });

  it('system message contains anti-hallucination rules', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    const sys = r.messages[0].content;
    expect(sys).toMatch(/Используй ТОЛЬКО факты/i);
    expect(sys).toMatch(/Не выдумывай/i);
  });

  it('system message contains banned AI patterns section', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    const sys = r.messages[0].content;
    expect(sys).toMatch(/ЗАПРЕЩЁННЫЕ AI-ПАТТЕРНЫ/i);
    // Spot-check a few banned patterns
    expect(sys).toMatch(/кроме того/);
    expect(sys).toMatch(/не только.*но и/);
    expect(sys).toMatch(/обеспечивая/);
  });

  it('user message includes scorecard.mission', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    const user = r.messages[1].content;
    expect(user).toMatch(/Разработка интерфейсов/);
    expect(user).toMatch(/Senior Frontend Developer/);
  });

  it('user message includes all outcomes', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    const user = r.messages[1].content;
    expect(user).toMatch(/Разработка UI компонентов/);
    expect(user).toMatch(/Оптимизация производительности/);
  });

  it('user message includes all evidence items with competency + evidenceText', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'formal');
    const user = r.messages[1].content;
    expect(user).toMatch(/\[React\]/);
    expect(user).toMatch(/Работал с React, делал UI компоненты/);
    expect(user).toMatch(/\[TypeScript\]/);
    expect(user).toMatch(/Разрабатывал на TypeScript микросервисы/);
  });

  it('tone forwarded: friendly -> system message mentions friendly', () => {
    const r = buildPrompt(baseScorecard, baseEvidence, 'friendly');
    const sys = r.messages[0].content;
    expect(sys.toLowerCase()).toMatch(/friendly/);
  });
});
