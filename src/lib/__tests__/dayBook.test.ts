import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getCarryForwardCash } from '../dayBook';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { resetDeviceCache } from '../../db/ids';
import { useDayStore } from '../../store/dayStore';
import type { DayBook } from '../../db/types';

function day(over: Partial<DayBook>): DayBook {
  return {
    id: 1,
    date: '2026-08-27T03:00:00.000Z',
    openingCash: 0,
    closingCashExpected: 0,
    closingCashCounted: 0,
    variance: 0,
    note: '',
    status: 'closed',
    ...over,
  };
}

describe('getCarryForwardCash', () => {
  it('returns 0 when no day has ever been closed', () => {
    expect(getCarryForwardCash([])).toBe(0);
    expect(getCarryForwardCash([day({ status: 'open', closedAt: undefined })])).toBe(0);
  });

  it('carries the counted cash, not the expected cash', () => {
    const days = [
      day({ id: 1, closingCashExpected: 93000, closingCashCounted: 90000, closedAt: '2026-08-28T16:00:00.000Z' }),
    ];
    // The drawer physically held 900, even though 930 was expected.
    expect(getCarryForwardCash(days)).toBe(90000);
  });

  it('uses the most recently closed day regardless of array order', () => {
    const days = [
      day({ id: 1, closingCashCounted: 10000, closedAt: '2026-08-26T16:00:00.000Z' }),
      day({ id: 3, closingCashCounted: 30000, closedAt: '2026-08-28T16:00:00.000Z' }),
      day({ id: 2, closingCashCounted: 20000, closedAt: '2026-08-27T16:00:00.000Z' }),
    ];
    expect(getCarryForwardCash(days)).toBe(30000);
  });

  it('ignores days that are still open', () => {
    const days = [
      day({ id: 1, closingCashCounted: 50000, closedAt: '2026-08-28T16:00:00.000Z' }),
      day({ id: 2, status: 'open', closingCashCounted: 99999, closedAt: undefined }),
    ];
    expect(getCarryForwardCash(days)).toBe(50000);
  });
});

describe('never two open days at once', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetDeviceCache();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
  });

  it('joins the day already open instead of starting a second', async () => {
    // Two open day books split one day's trade: sales land on whichever is
    // found first, and neither closing count reconciles.
    const first = await useDayStore.getState().openNewDay(500);
    const second = await useDayStore.getState().openNewDay(900);

    expect(second.id).toBe(first.id);
    expect(second.openingCash).toBe(first.openingCash);
    expect(await db.dayBook.filter((d) => d.status === 'open').count()).toBe(1);
  });

  it('survives a double tap on Open Day Book', async () => {
    const [a, b] = await Promise.all([
      useDayStore.getState().openNewDay(500),
      useDayStore.getState().openNewDay(500),
    ]);

    expect(a.id).toBe(b.id);
    expect(await db.dayBook.count()).toBe(1);
  });

  it('logs the opening once, not twice', async () => {
    await useDayStore.getState().openNewDay(500);
    await useDayStore.getState().openNewDay(500);
    const opens = await db.auditLog.filter((a) => a.action === 'day.open').count();
    expect(opens).toBe(1);
  });

  it('opens a fresh day once the previous one is closed', async () => {
    const first = await useDayStore.getState().openNewDay(500);
    await useDayStore.getState().closeCurrentDay(
      500, 50000, '', { grossSalesPaise: 0, cogsPaise: 0, expensesPaise: 0 }, 'owner'
    );

    const second = await useDayStore.getState().openNewDay(700);
    expect(second.id).not.toBe(first.id);
    expect(second.openingCash).toBe(70000);
  });
});
