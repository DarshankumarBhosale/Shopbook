import { describe, it, expect } from 'vitest';
import {
  rowsToPush, advanceHighWater, mergeDecision, planMerge, nextPullCursor,
  isAppendOnly, PUSH_ORDER, SYNC_TABLES,
} from '../syncPlan';

const BLOCK = 1_000_000_000_000;

describe('what gets pushed', () => {
  it('sends only this device rows above the high-water mark', () => {
    const rows = [
      { id: 1 * BLOCK + 1 },
      { id: 1 * BLOCK + 2 },
      { id: 1 * BLOCK + 3 },
    ];
    const out = rowsToPush('sales', rows, 1, BLOCK, 1 * BLOCK + 1);
    expect(out.map((r) => r.id)).toEqual([1 * BLOCK + 2, 1 * BLOCK + 3]);
  });

  it('never pushes back rows the other device minted', () => {
    // These arrived from the server. Echoing them would fight whatever the
    // other phone has since done to them.
    const rows = [{ id: 1 * BLOCK + 5 }, { id: 2 * BLOCK + 9 }];
    const out = rowsToPush('sales', rows, 1, BLOCK, 0);
    expect(out.map((r) => r.id)).toEqual([1 * BLOCK + 5]);
  });

  it('sends mutable tables whole, since they are small and get edited', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 38 }];
    expect(rowsToPush('items', items, 1, BLOCK, 999999)).toHaveLength(3);
  });

  it('sends seeded append-only rows once, then stops', () => {
    const seeded = [{ id: 1 }, { id: 2 }];
    expect(rowsToPush('stockMoves', seeded, 1, BLOCK, 0)).toHaveLength(2);
    expect(rowsToPush('stockMoves', seeded, 1, BLOCK, 2)).toHaveLength(0);
  });

  it('advances the high-water mark to the largest ID sent', () => {
    expect(advanceHighWater(5, [{ id: 9 }, { id: 3 }, { id: 7 }])).toBe(9);
    expect(advanceHighWater(20, [{ id: 9 }])).toBe(20);
    expect(advanceHighWater(0, [])).toBe(0);
  });
});

describe('who wins a conflict', () => {
  it('takes anything not held locally', () => {
    expect(mergeDecision('items', undefined, { updatedAt: '2026-01-01' })).toBe('take-remote');
  });

  it('keeps the local copy of an append-only row', () => {
    // A sale never changes, so a local copy is already right.
    expect(
      mergeDecision('sales', { updatedAt: '2020-01-01' }, { updatedAt: '2030-01-01' })
    ).toBe('keep-local');
  });

  it('lets the newer edit win on a mutable row', () => {
    expect(
      mergeDecision('items', { updatedAt: '2026-08-01T10:00:00Z' }, { updatedAt: '2026-08-01T11:00:00Z' })
    ).toBe('take-remote');
    expect(
      mergeDecision('items', { updatedAt: '2026-08-01T12:00:00Z' }, { updatedAt: '2026-08-01T11:00:00Z' })
    ).toBe('keep-local');
  });

  it('keeps local on an exact tie', () => {
    const t = '2026-08-01T10:00:00Z';
    expect(mergeDecision('expenses', { updatedAt: t }, { updatedAt: t })).toBe('keep-local');
  });
});

describe('planning a merge', () => {
  it('writes new rows and strips the server timestamp', () => {
    const { toWrite, skipped } = planMerge(
      'items',
      [{ id: 5, name: 'Chai', updatedAt: '2026-08-01T10:00:00Z' }],
      new Map()
    );
    expect(skipped).toBe(0);
    expect(toWrite).toHaveLength(1);
    expect(toWrite[0]).toEqual({ id: 5, name: 'Chai' });
    expect('updatedAt' in toWrite[0]).toBe(false);
  });

  it('leaves an already-known sale alone', () => {
    const { toWrite, skipped } = planMerge(
      'sales',
      [{ id: 99, grossAmount: 1500, updatedAt: '2026-08-01T10:00:00Z' }],
      new Map([[99, { updatedAt: '2026-07-01T10:00:00Z' }]])
    );
    expect(toWrite).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('ignores a row with no usable id rather than writing a broken one', () => {
    const { toWrite, skipped } = planMerge(
      'items',
      [{ name: 'no id', updatedAt: '2026-08-01T10:00:00Z' }],
      new Map()
    );
    expect(toWrite).toHaveLength(0);
    expect(skipped).toBe(1);
  });
});

describe('the pull cursor', () => {
  it('rewinds a second so a row written in the same second is not skipped', () => {
    const next = nextPullCursor(
      [{ updatedAt: '2026-08-31T10:00:05.000Z' }],
      '2026-08-31T09:00:00.000Z'
    );
    expect(next).toBe('2026-08-31T10:00:04.000Z');
  });

  it('holds still when nothing newer arrived', () => {
    const prev = '2026-08-31T09:00:00.000Z';
    expect(nextPullCursor([], prev)).toBe(prev);
    expect(nextPullCursor([{ updatedAt: '2026-08-01T00:00:00.000Z' }], prev)).toBe(prev);
  });
});

describe('table configuration', () => {
  it('classifies every synced table exactly once', () => {
    expect(new Set(SYNC_TABLES).size).toBe(SYNC_TABLES.length);
    expect(isAppendOnly('sales')).toBe(true);
    expect(isAppendOnly('items')).toBe(false);
  });

  it('pushes parents before the rows that reference them', () => {
    // A sale line pointing at a sale the server has not seen yet would be
    // orphaned, so ordering here is load-bearing.
    const at = (t: string) => PUSH_ORDER.indexOf(t as never);
    expect(at('sales')).toBeLessThan(at('saleLines'));
    expect(at('dayBook')).toBeLessThan(at('sales'));
    expect(at('customers')).toBeLessThan(at('payments'));
    expect(at('items')).toBeLessThan(at('recipes'));
    expect(at('rawMaterials')).toBeLessThan(at('recipes'));
    expect(at('rawMaterials')).toBeLessThan(at('stockMoves'));
  });

  it('covers every synced table in the push order', () => {
    for (const t of SYNC_TABLES) expect(PUSH_ORDER).toContain(t);
  });
});
