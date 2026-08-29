import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useSaleStore } from '../../store/saleStore';
import { useDayStore } from '../../store/dayStore';

describe('sortOrder Position Stability & Master Editing', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });
  });

  it('preserves position stability after multiple sales', async () => {
    const day = await useDayStore.getState().openNewDay(2000);
    const initialItems = await db.items.toArray();
    const sortedInitial = [...initialItems].sort((a, b) => a.sortOrder - b.sortOrder);

    // Initial sort order check: menu order, 1 to 25
    expect(sortedInitial[0].name).toBe('Plain Upma'); // sortOrder: 1
    expect(sortedInitial[20].name).toBe('Tea');       // sortOrder: 21
    expect(sortedInitial[21].name).toBe('Coffee');    // sortOrder: 22

    // Commit sales for Tea and Coffee
    useSaleStore.getState().addToCart(23); // Tea
    useSaleStore.getState().addToCart(23); // Tea
    useSaleStore.getState().addToCart(24); // Coffee
    await useSaleStore.getState().commitSale({ dayId: day.id!, paymentMode: 'Cash' });

    // Verify sortOrder did NOT change due to sales volume
    const itemsAfterSale = await db.items.toArray();
    const sortedAfter = [...itemsAfterSale].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(sortedAfter.map((i) => i.id)).toEqual(sortedInitial.map((i) => i.id));
    expect(sortedAfter[0].name).toBe('Plain Upma');
    expect(sortedAfter[20].name).toBe('Tea');
    expect(sortedAfter[21].name).toBe('Coffee');
  });

  it('allows owner to reorder tiles in Master screen', async () => {
    // Owner sets Tea (id: 23) to sortOrder 1 and Plain Upma (id: 1) to sortOrder 21
    await db.items.update(23, { sortOrder: 1 });
    await db.items.update(1, { sortOrder: 21 });

    const items = await db.items.toArray();
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(sorted[0].name).toBe('Tea');
    expect(sorted[0].sortOrder).toBe(1);
  });
});
