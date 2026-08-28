import { describe, it, expect } from 'vitest';
import { computeExpectedCash, computeVariance, isReconciliationValid } from '../cashRecon';

describe('cashRecon pure functions', () => {
  it('computes expected drawer cash correctly', () => {
    // Opening: ₹2,000 (200,000 paise)
    // Cash sales: ₹40 (4,000 paise - 2 Vada Pav)
    // Cash expenses: ₹400 (40,000 paise)
    // Expected: 200,000 + 4,000 - 40,000 = 164,000 paise (₹1,640)
    const expected = computeExpectedCash(200000, 4000, 40000, 0);
    expect(expected).toBe(164000);
  });

  it('computes cash variance (counted - expected)', () => {
    // Expected: 164,000 paise (₹1,640)
    // Counted: ₹1,640 (164,000 paise) -> Variance: 0
    expect(computeVariance(164000, 164000)).toBe(0);

    // Counted: ₹1,600 (160,000 paise) -> Variance: -4,000 paise (-₹40 short)
    expect(computeVariance(164000, 160000)).toBe(-4000);

    // Counted: ₹1,700 (170,000 paise) -> Variance: +6,000 paise (+₹60 excess)
    expect(computeVariance(164000, 170000)).toBe(6000);
  });

  it('validates reconciliation input', () => {
    // Exact match needs no note
    expect(isReconciliationValid('1640', 164000, '')).toBe(true);

    // Mismatch requires a note
    expect(isReconciliationValid('1600', 164000, '')).toBe(false);
    expect(isReconciliationValid('1600', 164000, '   ')).toBe(false);
    expect(isReconciliationValid('1600', 164000, 'Coin change shortage')).toBe(true);

    // Empty or invalid input is rejected
    expect(isReconciliationValid('', 164000, 'note')).toBe(false);
    expect(isReconciliationValid('abc', 164000, 'note')).toBe(false);
    expect(isReconciliationValid('-50', 164000, 'note')).toBe(false);
  });
});
