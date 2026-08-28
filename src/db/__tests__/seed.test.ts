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
    expect(await db.items.count()).toBe(14);
    expect(await db.shops.count()).toBe(1);
  });

  it('is a no-op when the database is already seeded', async () => {
    await seedDatabaseIfEmpty();
    const seededAgain = await seedDatabaseIfEmpty();

    expect(seededAgain).toBe(false);
    expect(await db.items.count()).toBe(14);
  });
});
