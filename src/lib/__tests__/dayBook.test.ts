import { describe, it, expect } from 'vitest';
import { getCarryForwardCash } from '../dayBook';
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
