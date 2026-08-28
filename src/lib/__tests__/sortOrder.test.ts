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

    // Initial sort order check: 1 to 14
    expect(sortedInitial[0].name).toBe('Vada Pav'); // sortOrder: 1
    expect(sortedInitial[11].name).toBe('Chai');     // sortOrder: 12
    expect(sortedInitial[12].name).toBe('Coffee');   // sortOrder: 13

    // Commit sales for Chai and Coffee
    useSaleStore.getState().addToCart(12); // Chai
    useSaleStore.getState().addToCart(12); // Chai
    useSaleStore.getState().addToCart(13); // Coffee
    await useSaleStore.getState().commitSale({ dayId: day.id!, paymentMode: 'Cash' });

    // Verify sortOrder did NOT change due to sales volume
    const itemsAfterSale = await db.items.toArray();
    const sortedAfter = [...itemsAfterSale].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(sortedAfter.map((i) => i.id)).toEqual(sortedInitial.map((i) => i.id));
    expect(sortedAfter[0].name).toBe('Vada Pav');
    expect(sortedAfter[11].name).toBe('Chai');
    expect(sortedAfter[12].name).toBe('Coffee');
  });

  it('allows owner to reorder tiles in Master screen', async () => {
    // Owner sets Chai (id: 12) to sortOrder 1 and Vada Pav (id: 1) to sortOrder 12
    await db.items.update(12, { sortOrder: 1 });
    await db.items.update(1, { sortOrder: 12 });

    const items = await db.items.toArray();
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

    expect(sorted[0].name).toBe('Chai');
    expect(sorted[0].sortOrder).toBe(1);
  });
});
