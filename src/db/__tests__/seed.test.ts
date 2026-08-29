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
    expect(await db.items.count()).toBe(27);
    expect(await db.shops.count()).toBe(1);
  });

  it('is a no-op when the database is already seeded', async () => {
    await seedDatabaseIfEmpty();
    const seededAgain = await seedDatabaseIfEmpty();

    expect(seededAgain).toBe(false);
    expect(await db.items.count()).toBe(27);
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
    expect(await db.items.count()).toBe(27);
    expect(await db.rawMaterials.count()).toBe(32);
    expect(await db.shops.count()).toBe(1);
    expect((await db.shops.get(1))?.name).toBe('Aaisaheb Snacks Center');
  });
});
