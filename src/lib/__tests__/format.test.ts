import { describe, it, expect } from 'vitest';
import { formatRupees, formatRupeesRaw, toPaise } from '../format';

describe('formatting money', () => {
  it('shows whole rupees with Indian grouping', () => {
    expect(formatRupees(1500)).toBe('₹15');
    expect(formatRupees(16000)).toBe('₹160');
    expect(formatRupees(10000000)).toBe('₹1,00,000');
  });

  it('puts the minus sign before the rupee symbol, not after it', () => {
    // A loss printed as "₹-396" reads as a stray character rather than a
    // negative amount, and net profit is the figure most worth reading right.
    expect(formatRupees(-39600)).toBe('-₹396');
    expect(formatRupees(-100)).toBe('-₹1');
    expect(formatRupeesRaw(-396)).toBe('-₹396');
  });

  it('keeps grouping on a large loss', () => {
    expect(formatRupees(-10000000)).toBe('-₹1,00,000');
  });

  it('has no sign at zero', () => {
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(-40)).toBe('₹0'); // rounds to zero, so no minus
  });

  it('survives a missing value rather than printing NaN', () => {
    expect(formatRupees(undefined as unknown as number)).toBe('₹0');
    expect(formatRupeesRaw(undefined as unknown as number)).toBe('₹0');
  });
});

describe('reading money in', () => {
  it('turns rupees into whole paise', () => {
    expect(toPaise(15)).toBe(1500);
    expect(toPaise('15')).toBe(1500);
  });

  it('round-trips through the formatter', () => {
    for (const rupees of [0, 1, 15, 160, 1000, 99999]) {
      expect(formatRupees(toPaise(rupees))).toBe(formatRupeesRaw(rupees));
    }
  });
});
