/**
 * TESTS: negotiations UI helpers (F1.9)
 * Covers computeStatusCounts, computeTabOriginCounts, formatSummaryText,
 * renderStatusChip, renderTabOriginChip.
 */

import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  TAB_ORIGIN_CONFIG,
  TAB_ORIGIN_LABELS,
  computeStatusCounts,
  computeTabOriginCounts,
  formatSummaryText,
  renderStatusChip,
  renderTabOriginChip,
} from '../src/ui/tabs/negotiations-summary.js';

describe('F1.9 -- STATUS_CONFIG', () => {
  it('has 5 statuses (invite, not-viewed, viewed, discard, unknown)', () => {
    const keys = Object.keys(STATUS_CONFIG);
    expect(keys.sort()).toEqual(['discard', 'invite', 'not-viewed', 'unknown', 'viewed']);
  });

  it('each status has bg, fg, border, label', () => {
    for (const [k, cfg] of Object.entries(STATUS_CONFIG)) {
      expect(cfg.bg).toMatch(/^#/);
      expect(cfg.fg).toMatch(/^#/);
      expect(cfg.border).toMatch(/^#/);
      expect(cfg.label).toBeTruthy();
    }
  });
});

describe('F1.9 -- TAB_ORIGIN_LABELS', () => {
  it('has labels for all 8 hh.ru tabs', () => {
    const ids = Object.keys(TAB_ORIGIN_LABELS);
    expect(ids.sort()).toEqual(
      ['all', 'archive', 'consider', 'deleted', 'discard', 'invite', 'offer', 'wait']
    );
  });

  it('labels are in Russian', () => {
    expect(TAB_ORIGIN_LABELS.all).toBe('Все');
    expect(TAB_ORIGIN_LABELS.invite).toBe('Приглашение');
    expect(TAB_ORIGIN_LABELS.discard).toBe('Отказ');
  });
});

describe('F1.9 -- computeStatusCounts', () => {
  it('returns zero counts for empty array', () => {
    const c = computeStatusCounts([]);
    expect(c.all).toBe(0);
    expect(c.invite).toBe(0);
    expect(c.viewed).toBe(0);
  });

  it('returns zero counts for null/undefined input', () => {
    expect(computeStatusCounts(null).all).toBe(0);
    expect(computeStatusCounts(undefined).all).toBe(0);
  });

  it('counts each status correctly', () => {
    const items = [
      { status: 'invite' },
      { status: 'not-viewed' },
      { status: 'not-viewed' },
      { status: 'viewed' },
      { status: 'discard' },
      { status: 'discard' },
      { status: 'discard' },
    ];
    const c = computeStatusCounts(items);
    expect(c.all).toBe(7);
    expect(c.invite).toBe(1);
    expect(c['not-viewed']).toBe(2);
    expect(c.viewed).toBe(1);
    expect(c.discard).toBe(3);
  });

  it('counts unknown status as unknown', () => {
    const items = [
      { status: 'invite' },
      { status: 'weird-status' },
      { status: undefined },
      {},
    ];
    const c = computeStatusCounts(items);
    expect(c.all).toBe(4);
    expect(c.unknown).toBe(3);  // weird + undefined + missing
  });

  it('skips null/undefined items (anti-ghost)', () => {
    const items = [null, undefined, { status: 'invite' }, null];
    const c = computeStatusCounts(items);
    expect(c.all).toBe(1);
    expect(c.invite).toBe(1);
  });
});

describe('F1.9 -- computeTabOriginCounts', () => {
  it('returns zero counts for all 8 tabs when empty input', () => {
    const c = computeTabOriginCounts([]);
    expect(Object.keys(c)).toHaveLength(8);
    expect(c.all).toBe(0);
    expect(c.invite).toBe(0);
    expect(c.archive).toBe(0);
  });

  it('counts items per tab origin', () => {
    const items = [
      { tabOrigin: 'all' },
      { tabOrigin: 'all' },
      { tabOrigin: 'wait' },
      { tabOrigin: 'discard' },
      { tabOrigin: 'discard' },
      { tabOrigin: 'discard' },
    ];
    const c = computeTabOriginCounts(items);
    expect(c.all).toBe(2);
    expect(c.wait).toBe(1);
    expect(c.discard).toBe(3);
    expect(c.invite).toBe(0);
  });

  it('handles items without tabOrigin (defaults to all)', () => {
    const items = [{ status: 'invite' }, { status: 'viewed' }];
    const c = computeTabOriginCounts(items);
    expect(c.all).toBe(2);
  });

  it('skips null items', () => {
    const items = [null, undefined, { tabOrigin: 'all' }];
    const c = computeTabOriginCounts(items);
    expect(c.all).toBe(1);
  });
});

describe('F1.9 -- formatSummaryText', () => {
  it('returns "Нет откликов" for zero count', () => {
    expect(formatSummaryText({ all: 0 })).toBe('Нет откликов');
  });

  it('returns "Нет откликов" for null/undefined', () => {
    expect(formatSummaryText(null)).toBe('Нет откликов');
    expect(formatSummaryText(undefined)).toBe('Нет откликов');
  });

  it('declension: 1 -> отклик', () => {
    expect(formatSummaryText({ all: 1 })).toBe('1 отклик');
  });

  it('declension: 2-4 -> отклика', () => {
    expect(formatSummaryText({ all: 2 })).toBe('2 отклика');
    expect(formatSummaryText({ all: 3 })).toBe('3 отклика');
    expect(formatSummaryText({ all: 4 })).toBe('4 отклика');
  });

  it('declension: 5+ -> откликов', () => {
    expect(formatSummaryText({ all: 5 })).toBe('5 откликов');
    expect(formatSummaryText({ all: 11 })).toBe('11 откликов');
    expect(formatSummaryText({ all: 21 })).toBe('21 отклик');
    expect(formatSummaryText({ all: 22 })).toBe('22 отклика');
    expect(formatSummaryText({ all: 25 })).toBe('25 откликов');
  });
});

describe('F1.9 -- renderStatusChip', () => {
  it('renders a button with data-status attribute', () => {
    const html = renderStatusChip('invite', 3, false);
    expect(html).toContain('<button');
    expect(html).toContain('data-status="invite"');
    expect(html).toContain('Приглашение');
    expect(html).toContain('3');
  });

  it('renders active chip with filled background', () => {
    const html = renderStatusChip('discard', 2, true);
    expect(html).toContain('btn-primary');
    expect(html).toContain('Отказ');
  });

  it('renders inactive chip with light background', () => {
    const html = renderStatusChip('viewed', 1, false);
    expect(html).toContain('btn-outline');
    expect(html).toContain('Просмотрен');
  });

  it('"all" chip has label "Все"', () => {
    const html = renderStatusChip('all', 11, true);
    expect(html).toContain('Все');
    expect(html).toContain('11');
  });
});

describe('F1.9 -- renderTabOriginChip', () => {
  it('renders a button with data-tab-origin attribute', () => {
    const html = renderTabOriginChip('wait', 5, false);
    expect(html).toContain('<button');
    expect(html).toContain('data-tab-origin="wait"');
    expect(html).toContain('Ожидание');
    expect(html).toContain('5');
  });

  it('renders active chip with filled background', () => {
    const html = renderTabOriginChip('discard', 6, true);
    expect(html).toContain('background:#DC2626');
    expect(html).toContain('color:#fff');
  });

  it('renders inactive chip with light background', () => {
    const html = renderTabOriginChip('invite', 1, false);
    expect(html).toContain('background:#ECFDF5');
    expect(html).toContain('color:#059669');
  });
});
