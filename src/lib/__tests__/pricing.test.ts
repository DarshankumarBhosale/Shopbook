import { describe, it, expect } from 'vitest';
import { parsePriceRupees, suggestOnlinePrice } from '../pricing';

describe('parsePriceRupees', () => {
  it('converts whole rupees to paise', () => {
    expect(parsePriceRupees('35')).toBe(3500);
    expect(parsePriceRupees('350')).toBe(35000);
    expect(parsePriceRupees('0')).toBe(0);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parsePriceRupees('  15  ')).toBe(1500);
  });

  it('rejects anything that is not a whole rupee amount', () => {
    // Rejected rather than coerced: a price silently saved as 0 is worse
    // than the edit not landing at all.
    expect(parsePriceRupees('')).toBeNull();
    expect(parsePriceRupees('   ')).toBeNull();
    expect(parsePriceRupees('abc')).toBeNull();
    expect(parsePriceRupees('35.50')).toBeNull();
    expect(parsePriceRupees('-20')).toBeNull();
    expect(parsePriceRupees('1e5')).toBeNull();
    expect(parsePriceRupees('₹35')).toBeNull();
  });
});

describe('suggestOnlinePrice', () => {
  it('marks counter price up ~30% and rounds up to the nearest ₹5', () => {
    expect(suggestOnlinePrice(3500)).toBe(5000); // 35 -> 45.5 -> 50
    expect(suggestOnlinePrice(5000)).toBe(6500); // 50 -> 65 -> 65
    expect(suggestOnlinePrice(1500)).toBe(2000); // 15 -> 19.5 -> 20
    expect(suggestOnlinePrice(16000)).toBe(21000); // 160 -> 208 -> 210
  });

  it('returns 0 for a zero or negative counter price', () => {
    expect(suggestOnlinePrice(0)).toBe(0);
    expect(suggestOnlinePrice(-100)).toBe(0);
  });
});
