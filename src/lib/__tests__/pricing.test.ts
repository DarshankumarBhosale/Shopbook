import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { parsePriceRupees, suggestOnlinePrice } from '../pricing';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { resetDeviceCache } from '../../db/ids';
import { useItemStore } from '../../store/itemStore';

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

describe('the store refuses a free price', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetDeviceCache();
    await seedDatabaseIfEmpty();
  });

  it('rejects zero, which used to be accepted', async () => {
    // Clearing the field and saving left the item ringing up free while still
    // consuming its ingredients — a loss nobody sees until the month is short.
    await expect(
      useItemStore.getState().setCounterPrice(11, 0, 'owner')
    ).rejects.toThrow(/more than zero/i);

    const item = await db.items.get(11);
    expect(item?.sellPriceCounter).toBeGreaterThan(0);
  });

  it('rejects a negative price too', async () => {
    await expect(
      useItemStore.getState().setCounterPrice(11, -500, 'owner')
    ).rejects.toThrow();
  });

  it('points at the On/Off switch, which is the real way to stop selling', async () => {
    await expect(
      useItemStore.getState().setCounterPrice(11, 0, 'owner')
    ).rejects.toThrow(/On\/Off/);
  });

  it('still accepts an ordinary price', async () => {
    await useItemStore.getState().setCounterPrice(11, 2000, 'owner');
    expect((await db.items.get(11))?.sellPriceCounter).toBe(2000);
  });
});
