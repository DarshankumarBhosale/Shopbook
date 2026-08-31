import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

/**
 * The sync engine driven end to end against a stand-in server.
 *
 * The pure rules are covered in syncPlan.test.ts. What this adds is everything
 * around them: push order, the pull cursor, the sent-map bookkeeping, and
 * whether a sale rung up on one phone actually arrives intact on the other with
 * its lines still attached and its money unchanged. Those only break when the
 * pieces are wired together, which is precisely where a lost sale would come
 * from.
 */

interface ServerRow { id: number; updatedAt: string; [k: string]: unknown }

/** Stands in for PostgREST: upsert by id, and read what changed since a time. */
class FakeServer {
  tables = new Map<string, Map<number, ServerRow>>();
  /** Server-side clock. Rows are stamped here, never by the caller. */
  private tick = 0;
  /** Every table a push touched, in the order it touched them. */
  pushOrder: string[] = [];
  failNext: string | null = null;

  private table(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  private stamp(): string {
    this.tick += 1000;
    return new Date(Date.UTC(2026, 7, 31) + this.tick).toISOString();
  }

  upsert(name: string, rows: Record<string, unknown>[]): { error: { message: string } | null } {
    if (this.failNext === name) {
      this.failNext = null;
      return { error: { message: 'connection lost' } };
    }

    // PostgREST refuses a batch whose objects differ in shape.
    const shapes = new Set(rows.map((r) => Object.keys(r).sort().join(',')));
    if (shapes.size > 1) {
      return { error: { message: 'all object keys must match' } };
    }

    this.pushOrder.push(name);
    const t = this.table(name);
    const at = this.stamp();
    for (const row of rows) {
      t.set(row.id as number, { ...(row as ServerRow), updatedAt: at });
    }
    return { error: null };
  }

  select(name: string, after: string, limit: number): ServerRow[] {
    return [...this.table(name).values()]
      .filter((r) => r.updatedAt > after)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(0, limit);
  }

  rows(name: string): ServerRow[] {
    return [...this.table(name).values()];
  }
}

let server = new FakeServer();
let signedIn = true;

function fakeClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: signedIn ? { user: { email: 'shop@test' } } : null } }),
    },
    from(name: string) {
      let after = '';
      let limit = 1000;
      const builder = {
        upsert: async (rows: Record<string, unknown>[]) => server.upsert(name, rows),
        select: () => builder,
        gt: (_col: string, value: string) => { after = value; return builder; },
        order: () => builder,
        limit: (n: number) => { limit = n; return builder; },
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: server.select(name, after, limit), error: null }),
      };
      return builder;
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: async () => {},
  };
}

vi.mock('../supabase', () => ({
  getSupabase: () => fakeClient(),
  isSyncConfigured: () => true,
}));

const { db } = await import('../../db/schema');
const { seedDatabaseIfEmpty } = await import('../../db/seed');
const { setDeviceNo, resetDeviceCache, deviceOfId } = await import('../../db/ids');
const { useSyncStore } = await import('../../store/syncStore');
const { useDayStore } = await import('../../store/dayStore');
const { useSaleStore } = await import('../../store/saleStore');

/** Wipes this phone and sets it up as a given device. Nothing is kept. */
async function becomeDevice(no: number, label: string) {
  await db.delete();
  await db.open();
  resetDeviceCache();
  await seedDatabaseIfEmpty();
  await setDeviceNo(no, label);
  useDayStore.setState({ openDay: null, isLoading: false });
  useSaleStore.setState({ cart: {} });
  useSyncStore.setState({ phase: 'idle', message: '', lastSyncAt: null });
  await useSyncStore.getState().init();
}

async function sell(itemId: number, label: string) {
  const open = useDayStore.getState().openDay;
  const day = open ?? (await useDayStore.getState().openNewDay(50000));
  useSaleStore.getState().addToCart(itemId);
  await useSaleStore.getState().commitSale({
    dayId: day.id!, paymentMode: 'Cash', createdBy: label,
  });
  return day;
}

const sync = () => useSyncStore.getState().syncNow();

describe('a sale crossing between two phones', () => {
  beforeEach(() => {
    server = new FakeServer();
    signedIn = true;
  });

  it('arrives on the other phone with its lines and money intact', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner'); // Vada Pav
    await sync();

    const ownerSale = (await db.sales.toArray())[0];
    const ownerLines = await db.saleLines.toArray();
    expect(useSyncStore.getState().phase, useSyncStore.getState().message).toBe('idle');
    expect(server.rows('sales')).toHaveLength(1);

    // A brand new phone, set up as device 2, syncing for the first time.
    await becomeDevice(2, 'helper');
    await sync();

    const pulled = await db.sales.get(ownerSale.id!);
    expect(pulled, "the owner's sale never reached the helper").toBeDefined();
    expect(pulled!.grossAmount).toBe(ownerSale.grossAmount);
    expect(pulled!.paymentMode).toBe(ownerSale.paymentMode);
    expect(pulled!.createdBy).toBe('owner');

    // The lines must still point at that same sale, or the bill is a shell.
    const lines = await db.saleLines.where('saleId').equals(ownerSale.id!).toArray();
    expect(lines).toHaveLength(ownerLines.length);
    expect(lines[0].amount).toBe(ownerLines[0].amount);
  });

  it('keeps both phones sales when each has rung one up', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    await sync();
    const ownerSaleId = (await db.sales.toArray())[0].id!;

    await becomeDevice(2, 'helper');
    await sync();                 // receives the owner's
    await sell(12, 'helper');     // rings up its own
    await sync();

    const helperOwn = (await db.sales.toArray()).find((s) => deviceOfId(s.id!) === 2);
    expect(helperOwn, 'the helper minted no sale of its own').toBeDefined();

    // Both are on the server, neither overwrote the other.
    const ids = server.rows('sales').map((r) => r.id).sort();
    expect(ids).toEqual([ownerSaleId, helperOwn!.id].sort());

    // And a fresh owner phone sees both.
    await becomeDevice(1, 'owner');
    await sync();
    const seen = (await db.sales.toArray()).map((s) => s.id).sort();
    expect(seen).toEqual([ownerSaleId, helperOwn!.id].sort());
  });

  it('sends a sale before the lines that reference it', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    await sync();

    const at = (t: string) => server.pushOrder.indexOf(t);
    expect(at('dayBook')).toBeLessThan(at('sales'));
    expect(at('sales')).toBeLessThan(at('saleLines'));
  });

  it('does not resend what it already sent', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    await sync();

    server.pushOrder = [];
    await sync();
    expect(server.pushOrder, 'a quiet sync still pushed rows').toEqual([]);
    expect(useSyncStore.getState().message).toBe('Already up to date');
  });

  it('sends the new sale, and only that, on the next sync', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    await sync();

    server.pushOrder = [];
    await sell(12, 'owner');
    await sync();

    expect(server.rows('sales')).toHaveLength(2);
    // Only what the second sale touched. Not the menu, the recipes or the raw
    // materials — and not the day book either, since a sale does not change it
    // (the totals are worked out at closing).
    expect(new Set(server.pushOrder)).toEqual(
      new Set(['sales', 'saleLines', 'stockMoves', 'auditLog'])
    );
  });
});

describe('when things go wrong', () => {
  beforeEach(() => {
    server = new FakeServer();
    signedIn = true;
  });

  it('reports a failed push instead of claiming success', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    server.failNext = 'sales';
    await sync();

    expect(useSyncStore.getState().phase).toBe('error');
    expect(useSyncStore.getState().lastSyncAt).toBeNull();
  });

  it('sends the sale on the retry after a dropped connection', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    server.failNext = 'sales';
    await sync();
    expect(server.rows('sales')).toHaveLength(0);

    await sync();
    expect(useSyncStore.getState().phase).toBe('idle');
    expect(server.rows('sales'), 'the sale was dropped rather than retried').toHaveLength(1);
  });

  it('does nothing at all when signed out', async () => {
    await becomeDevice(1, 'owner');
    await sell(11, 'owner');
    signedIn = false;
    await sync();

    expect(useSyncStore.getState().phase).toBe('signed-out');
    expect(server.rows('sales')).toHaveLength(0);
  });

  it('never sends a batch the server would reject for mixed shapes', async () => {
    // One sale with a note and one without used to fail the whole push.
    await becomeDevice(1, 'owner');
    const day = await sell(11, 'owner');
    await db.expenses.bulkPut([
      { id: 1e12 + 90, dayId: day.id!, category: 'Gas', amount: 100000, paymentMode: 'Cash', note: 'cylinder', isDeleted: false },
      { id: 1e12 + 91, dayId: day.id!, category: 'Misc', amount: 5000, paymentMode: 'Cash', isDeleted: false },
    ] as never);

    await sync();
    expect(useSyncStore.getState().phase, useSyncStore.getState().message).toBe('idle');
    expect(server.rows('expenses')).toHaveLength(2);
  });
});
