import { describe, it, expect } from 'vitest';
import {
  rowsToPush, advanceHighWater, mergeDecision, planMerge, nextPullCursor,
  isAppendOnly, PUSH_ORDER, SYNC_TABLES,
  rowFingerprint, changedRows, updateSentMap, normalizeBatch,
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

  it('sends every mutable row on the first sync, when nothing is on the server', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 38 }];
    expect(rowsToPush('items', items, 1, BLOCK, 999999, {})).toHaveLength(3);
  });

  it('stops sending a mutable row once the server already matches it', () => {
    const items = [{ id: 1, price: 1500 }, { id: 2, price: 1000 }];
    const sent = updateSentMap({}, items);
    expect(rowsToPush('items', items, 1, BLOCK, 0, sent)).toHaveLength(0);
  });

  it('sends a mutable row again after it is edited here', () => {
    const before = [{ id: 1, price: 1500 }];
    const sent = updateSentMap({}, before);
    const after = [{ id: 1, price: 1800 }];
    expect(rowsToPush('items', after, 1, BLOCK, 0, sent)).toEqual(after);
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

  it('keeps an edit this device has not managed to send yet', () => {
    // A local row carries no updatedAt, so remote would otherwise always win.
    // Push runs before pull, so being here means the push failed — reverting
    // the correction because the signal dropped would lose the shopkeeper's work.
    expect(
      mergeDecision('expenses', { updatedAt: undefined }, { updatedAt: '2030-01-01' }, true)
    ).toBe('keep-local');
  });
});

describe('an unsent local edit against an incoming row', () => {
  it('survives a pull that follows a failed push', () => {
    const edited = { id: 7, amount: 2500, note: 'cylinder' };
    // The server still holds the pre-edit version.
    const fromServer = { id: 7, amount: 1000, note: 'gas', updatedAt: '2030-01-01T00:00:00Z' };
    // The sent map records what was last agreed — the old contents.
    const sent = updateSentMap({}, [{ id: 7, amount: 1000, note: 'gas' }]);

    const { toWrite } = planMerge('expenses', [fromServer], new Map([[7, edited]]), sent);
    expect(toWrite, 'an unsent local edit was overwritten by the server copy').toHaveLength(0);
  });

  it('still takes the remote row when nothing was edited here', () => {
    const local = { id: 7, amount: 1000, note: 'gas' };
    const sent = updateSentMap({}, [local]);
    const fromServer = { id: 7, amount: 3000, note: 'gas', updatedAt: '2030-01-01T00:00:00Z' };

    const { toWrite } = planMerge('expenses', [fromServer], new Map([[7, local]]), sent);
    expect(toWrite).toHaveLength(1);
    expect(toWrite[0]).toMatchObject({ amount: 3000 });
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
  it('advances to the newest row seen, exactly', () => {
    // It used to rewind a second, which re-downloaded the most recent second of
    // rows on every sync forever — the counter never read "up to date".
    const next = nextPullCursor(
      [{ updatedAt: '2026-08-31T10:00:05.000Z' }],
      '2026-08-31T09:00:00.000Z'
    );
    expect(next).toBe('2026-08-31T10:00:05.000Z');
  });

  it('settles, so a second sync over the same rows pulls nothing', () => {
    const rows = [{ updatedAt: '2026-08-31T10:00:05.000Z' }];
    const first = nextPullCursor(rows, '1970-01-01T00:00:00.000Z');
    expect(nextPullCursor(rows, first)).toBe(first);
    expect(rows.every((r) => !(r.updatedAt > first))).toBe(true);
  });

  it('holds still when nothing newer arrived', () => {
    const prev = '2026-08-31T09:00:00.000Z';
    expect(nextPullCursor([], prev)).toBe(prev);
    expect(nextPullCursor([{ updatedAt: '2026-08-01T00:00:00.000Z' }], prev)).toBe(prev);
  });
});

describe('not clobbering the other phone edits', () => {
  it('does not push back a row it only received', () => {
    // The owner pulls the helper's expense. Nothing about it was edited here,
    // so it must not be sent back — a push would stamp the owner's copy newer
    // than whatever the helper has since done to it.
    const fromHelper = { id: 2 * BLOCK + 7, amount: 1000, note: 'gas' };

    const { toWrite } = planMerge('expenses', [{ ...fromHelper, updatedAt: '2026-08-30T10:00:00Z' }], new Map());
    const sent = updateSentMap({}, toWrite);

    expect(rowsToPush('expenses', toWrite, 1, BLOCK, 0, sent)).toHaveLength(0);
  });

  it('survives the full sequence that used to revert an expense edit', () => {
    // 1. Helper writes the expense, owner pulls it.
    const v1 = { id: 2 * BLOCK + 7, amount: 1000, note: 'gas' };
    const ownerCopy = planMerge('expenses', [{ ...v1, updatedAt: '2026-08-30T10:00:00Z' }], new Map()).toWrite;
    let ownerSent = updateSentMap({}, ownerCopy);

    // 2. Helper corrects the amount. The owner has not seen v2 yet.
    // 3. The owner syncs. Before the fingerprint check it pushed its whole
    //    expenses table, sending stale v1 back over the helper's v2.
    const ownerPush = rowsToPush('expenses', ownerCopy, 1, BLOCK, 0, ownerSent);
    expect(ownerPush, 'stale copy was pushed back over a newer edit').toHaveLength(0);

    // 4. The owner then pulls v2 and takes it, since the row is mutable and the
    //    server timestamp is newer.
    const v2 = { id: 2 * BLOCK + 7, amount: 2000, note: 'gas', updatedAt: '2026-08-30T11:00:00Z' };
    const localById = new Map([[v2.id, { updatedAt: '2026-08-30T10:00:00Z' }]]);
    const merged = planMerge('expenses', [v2], localById).toWrite;
    expect(merged[0]).toMatchObject({ amount: 2000 });

    // 5. And still does not echo it.
    ownerSent = updateSentMap(ownerSent, merged);
    expect(rowsToPush('expenses', merged, 1, BLOCK, 0, ownerSent)).toHaveLength(0);
  });

  it('does send the other phone row when this phone genuinely edits it', () => {
    const fromHelper = [{ id: 2 * BLOCK + 7, amount: 1000, note: 'gas' }];
    const sent = updateSentMap({}, fromHelper);
    const ownerEdit = [{ id: 2 * BLOCK + 7, amount: 1000, note: 'cylinder' }];
    expect(rowsToPush('expenses', ownerEdit, 1, BLOCK, 0, sent)).toEqual(ownerEdit);
  });
});

describe('row fingerprints', () => {
  it('ignores property order', () => {
    expect(rowFingerprint({ id: 1, a: 'x', b: 2 })).toBe(rowFingerprint({ b: 2, id: 1, a: 'x' }));
  });

  it('ignores the server timestamp, which is not ours to compare', () => {
    expect(rowFingerprint({ id: 1, a: 'x', updatedAt: '2020-01-01' }))
      .toBe(rowFingerprint({ id: 1, a: 'x', updatedAt: '2030-01-01' }));
  });

  it('changes when a value changes, including zero versus missing', () => {
    expect(rowFingerprint({ id: 1, amount: 100 })).not.toBe(rowFingerprint({ id: 1, amount: 101 }));
    expect(rowFingerprint({ id: 1, amount: 0 })).not.toBe(rowFingerprint({ id: 1 }));
  });

  it('skips rows with no id rather than treating them as changed forever', () => {
    expect(changedRows([{ name: 'orphan' }], {})).toHaveLength(0);
  });
});

describe('batching for the server', () => {
  it('gives every row the same keys, so an optional field cannot reject a batch', () => {
    // PostgREST refuses a bulk upsert whose objects differ in shape. A single
    // sale carrying a note would otherwise fail the whole day's push.
    const out = normalizeBatch([
      { id: 1, amount: 100, note: 'chai' },
      { id: 2, amount: 200 },
    ]);
    expect(Object.keys(out[0]).sort()).toEqual(Object.keys(out[1]).sort());
    expect(out[1].note).toBeNull();
  });

  it('turns undefined into null so clearing a field actually clears it', () => {
    const out = normalizeBatch([{ id: 1, note: 'x' }, { id: 2, note: undefined }]);
    expect(out[1].note).toBeNull();
  });

  it('leaves values alone otherwise', () => {
    const rows = [{ id: 1, amount: 0, ok: false }];
    expect(normalizeBatch(rows)).toEqual(rows);
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
