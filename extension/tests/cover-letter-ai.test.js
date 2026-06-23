/**
 * TESTS: cover-letter-ai orchestrator (F-CR-02)
 * ===============================================
 * generateAICoverLetter(vacancy, resume, opts) -> { ok, text?, method, warnings?, error?, code? }
 *
 * Flow: extractScorecard -> computeMatchScore -> mapEvidence -> buildPrompt
 *       -> sendMessage -> validateLetter -> applyTone
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We mock sendMessage + isAiAvailable at import time
vi.mock('../src/services/ai-service.js', () => ({
  isAiAvailable: vi.fn(),
  sendMessage: vi.fn(),
}));

import { generateAICoverLetter } from '../src/lib/cover-letter-ai.js';
import { isAiAvailable, sendMessage } from '../src/services/ai-service.js';

const baseVacancy = {
  title: 'Frontend Developer',
  company: 'Yandex',
  keySkills: ['React', 'TypeScript'],
  description: {
    text: '',
    sections: {
      responsibilities: 'Разработка UI. Оптимизация производительности.',
      requirements: 'Знание React. Опыт с TypeScript.',
      advantages: '', conditions: '', other: '',
    },
  },
};

const baseResume = {
  name: 'Ivan',
  position: 'Developer',
  skills: ['React', 'TypeScript', 'Node.js'],
  experience: [{
    company: 'Yandex',
    position: 'Junior Dev',
    period: '2018-2024',
    description: 'Работал с React, делал UI компоненты. Сократил рендеринг на 30%. TypeScript.',
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('F-CR-02 -- generateAICoverLetter', () => {
  it('no API key -> returns NO_API_KEY', async () => {
    isAiAvailable.mockResolvedValue(false);
    const r = await generateAICoverLetter(baseVacancy, baseResume, {});
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_API_KEY');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('no evidence (no matching skills) -> returns NO_EVIDENCE', async () => {
    isAiAvailable.mockResolvedValue(true);
    // Resume with completely different skills
    const wrongResume = {
      ...baseResume,
      skills: ['Cooking', 'Painting'],
      experience: [{ company: 'Cafe', position: 'Chef', period: '2020', description: 'Готовил еду.' }],
    };
    const r = await generateAICoverLetter(baseVacancy, wrongResume, {});
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_EVIDENCE');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('successful path with fetchImpl stub -> ok=true, text from LLM', async () => {
    isAiAvailable.mockResolvedValue(true);
    sendMessage.mockResolvedValue({
      ok: true,
      text: 'Здравствуйте! React 3 года, TypeScript. Готов к интервью.',
      usage: { total_tokens: 100 },
    });
    const r = await generateAICoverLetter(baseVacancy, baseResume, { tone: 'formal' });
    expect(r.ok).toBe(true);
    expect(r.text).toBeTruthy();
    expect(r.text.length).toBeGreaterThan(10);
    expect(r.method).toBe('ai');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('AI returns 500 -> returns AI_ERROR', async () => {
    isAiAvailable.mockResolvedValue(true);
    sendMessage.mockResolvedValue({
      ok: false,
      error: 'HTTP 500',
      code: 'HTTP_500',
    });
    const r = await generateAICoverLetter(baseVacancy, baseResume, {});
    expect(r.ok).toBe(false);
    expect(r.code).toBe('AI_ERROR');
    expect(r.error).toMatch(/500/);
  });

  it('AI returns text with **boldface** -> text cleaned, warnings populated, ok=true', async () => {
    isAiAvailable.mockResolvedValue(true);
    sendMessage.mockResolvedValue({
      ok: true,
      text: 'Здравствуйте! **React** опыт. TypeScript. Готов к интервью.',
    });
    const r = await generateAICoverLetter(baseVacancy, baseResume, {});
    expect(r.ok).toBe(true);
    expect(r.text).not.toContain('**');
    expect(r.warnings).toBeDefined();
    expect(r.warnings.some(w => /boldface/i.test(w))).toBe(true);
  });

  it('tone forwarded to buildPrompt', async () => {
    isAiAvailable.mockResolvedValue(true);
    sendMessage.mockResolvedValue({ ok: true, text: 'Письмо.' });
    await generateAICoverLetter(baseVacancy, baseResume, { tone: 'friendly' });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const call = sendMessage.mock.calls[0][0];
    const sys = call.messages[0].content;
    expect(sys.toLowerCase()).toMatch(/friendly/);
  });

  it('opts.fetchImpl forwarded to sendMessage', async () => {
    isAiAvailable.mockResolvedValue(true);
    const fakeFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'x' } }] }) });
    sendMessage.mockResolvedValue({ ok: true, text: 'Письмо.' });
    await generateAICoverLetter(baseVacancy, baseResume, { fetchImpl: fakeFetch });
    expect(sendMessage.mock.calls[0][0].fetchImpl).toBe(fakeFetch);
  });
});
