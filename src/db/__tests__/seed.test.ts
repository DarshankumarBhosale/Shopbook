import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../schema';
import { seedDatabaseIfEmpty } from '../seed';

describe('seedDatabaseIfEmpty', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('does not throw when called concurrently on an empty database', async () => {
    // Simulates React StrictMode double-invoking the init effect: two callers
    // both see an empty `items` table and race to seed. Only one should win;
    // neither call should reject with a ConstraintError.
    const [firstSeeded, secondSeeded] = await Promise.all([
      seedDatabaseIfEmpty(),
      seedDatabaseIfEmpty(),
    ]);

    expect([firstSeeded, secondSeeded].filter(Boolean)).toHaveLength(1);
    expect(await db.items.count()).toBe(38);
    expect(await db.shops.count()).toBe(1);
  });

  it('is a no-op when the database is already seeded', async () => {
    await seedDatabaseIfEmpty();
    const seededAgain = await seedDatabaseIfEmpty();

    expect(seededAgain).toBe(false);
    expect(await db.items.count()).toBe(38);
  });

  it('seeds even when a schema upgrade has preserved shops and users', async () => {
    // Reproduces the state left by the v3 upgrade, which clears the item and
    // raw-material masters but deliberately keeps shops and users. Rows with
    // explicit IDs must upsert here — a plain add collides on shop id 1, and
    // the resulting ConstraintError rolls the whole seed back, leaving the
    // shop with an empty menu.
    await db.shops.put({ id: 1, name: 'Existing shop', address: 'Somewhere', weeklyOff: 'Monday' });
    await db.users.put({ id: 1, name: 'Owner', role: 'owner', pin: '1234' });

    const seeded = await seedDatabaseIfEmpty();

    expect(seeded).toBe(true);
    expect(await db.items.count()).toBe(38);
    expect(await db.rawMaterials.count()).toBe(44);
    expect(await db.shops.count()).toBe(1);
    expect((await db.shops.get(1))?.name).toBe('Aaisaheb Snacks Center');
  });

  it('does not re-open stock for materials that already have a ledger', async () => {
    // Reproduces the v4 upgrade, which refreshes the menu but deliberately
    // keeps stockMoves so counts on hand survive. Seeding a second opening
    // balance here would silently double the stock in the kitchen.
    await seedDatabaseIfEmpty();
    const pavAfterSeed = (await db.stockMoves.where('rmId').equals(1).toArray())
      .reduce((sum, m) => sum + m.qty, 0);

    // A day of trading moves the ledger away from its opening balance.
    await db.stockMoves.add({
      dayId: 1, rmId: 1, type: 'sale', qty: -20, createdAt: new Date().toISOString(),
    });

    // v4-style upgrade: menu rebuilt, stock ledger left intact.
    await db.items.clear();
    await db.recipes.clear();
    await seedDatabaseIfEmpty();

    const pavAfterUpgrade = (await db.stockMoves.where('rmId').equals(1).toArray())
      .reduce((sum, m) => sum + m.qty, 0);

    expect(pavAfterSeed).toBe(160);
    expect(pavAfterUpgrade).toBe(140);
    expect(await db.items.count()).toBe(38);
  });

  it('refills a master table an upgrade cleared, even when items survived', async () => {
    // The v5 upgrade rebuilt the raw material master but left items alone.
    // Gating the whole seed on `items` being empty meant the kitchen came back
    // with 25 dishes and zero ingredients, and never recovered on reload.
    await seedDatabaseIfEmpty();
    await db.rawMaterials.clear();
    await db.customers.clear();

    const seeded = await seedDatabaseIfEmpty();

    expect(seeded).toBe(true);
    expect(await db.rawMaterials.count()).toBe(44);
    expect(await db.customers.count()).toBe(2);
    // Untouched tables are not duplicated.
    expect(await db.items.count()).toBe(38);
    expect(await db.recipes.count()).toBe(116);
  });
});
