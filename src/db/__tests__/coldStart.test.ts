import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../schema';
import { seedDatabaseIfEmpty } from '../seed';
import { resetDeviceCache, getDeviceNo, nextId } from '../ids';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useKhataStore } from '../../store/khataStore';

/**
 * The first write after the app is launched.
 *
 * `nextId()` needs the device number, which lives in the `meta` table, and it
 * is called from inside write transactions — a sale, an expense, an audit
 * entry. Those transactions did not declare `meta`, so the read threw
 * NotFoundError; and because the failed read left the cache empty, it threw on
 * every write afterwards too. A freshly opened app could not record a single
 * sale.
 *
 * It stayed hidden because the symptom only appears with a cold cache, and
 * every existing test happened to warm it during setup. These tests are
 * careful to leave it cold, which is what a just-launched phone looks like.
 */

async function coldStart() {
  await db.delete();
  await db.open();
  await seedDatabaseIfEmpty();
  useDayStore.setState({ openDay: null, isLoading: false });
  useSaleStore.setState({ cart: {} });
  const day = await useDayStore.getState().openNewDay(500);
  // Everything above may have warmed the cache. Put it back to how a
  // just-launched app actually looks.
  resetDeviceCache();
  return day;
}

describe('the first write after launch, with nothing warmed', () => {
  let dayId: number;

  beforeEach(async () => {
    const day = await coldStart();
    dayId = day.id!;
  });

  it('records a sale instead of throwing', async () => {
    useSaleStore.getState().addToCart(11);
    await useSaleStore.getState().commitSale({
      dayId, paymentMode: 'Cash', createdBy: 'owner',
    });

    expect(await db.sales.count()).toBe(1);
    expect(await db.saleLines.count()).toBe(1);
  });

  it('records an expense instead of throwing', async () => {
    await useExpenseStore.getState().addExpense({
      dayId, category: 'Gas cylinder', amountRupees: 1000, paymentMode: 'Cash',
    });
    expect(await db.expenses.count()).toBe(1);
  });

  it('records a khata payment instead of throwing', async () => {
    const customer = (await db.customers.toArray())[0];
    await useKhataStore.getState().receivePayment({
      dayId, customerId: customer.id!, amountRupees: 200, paymentMode: 'Cash',
    });
    expect(await db.payments.count()).toBe(1);
  });

  it('still allocates the ID from this device block', async () => {
    useSaleStore.getState().addToCart(11);
    await useSaleStore.getState().commitSale({
      dayId, paymentMode: 'Cash', createdBy: 'owner',
    });

    // Reading outside the transaction must not change which block is used.
    const sale = (await db.sales.toArray())[0];
    expect(sale.id).toBeGreaterThanOrEqual(1_000_000_000_000);
    expect(sale.id).toBeLessThan(2_000_000_000_000);
  });

  it('does not leave the app broken after one failed attempt', async () => {
    // The original fault poisoned every later write, not just the first.
    for (let i = 0; i < 3; i++) {
      useSaleStore.setState({ cart: {} });
      useSaleStore.getState().addToCart(11);
      await useSaleStore.getState().commitSale({
        dayId, paymentMode: 'Cash', createdBy: 'owner',
      });
    }
    expect(await db.sales.count()).toBe(3);
  });
});

describe('reading the device number from inside a transaction', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    resetDeviceCache();
  });

  it('works when the transaction declares meta, as every write must', async () => {
    await db.transaction('rw', [db.sales, db.auditLog, db.meta], async () => {
      const id = await nextId(db.sales);
      expect(id).toBeGreaterThanOrEqual(1_000_000_000_000);
    });
  });

  it('reports the same number inside and outside a transaction', async () => {
    const outside = await getDeviceNo();
    resetDeviceCache();

    let inside = 0;
    await db.transaction('r', [db.meta], async () => {
      inside = await getDeviceNo();
    });

    expect(inside).toBe(outside);
  });
});

describe('every transaction that logs also declares meta', () => {
  // recordAudit always allocates an ID, and allocating reads the device
  // number out of `meta`. A transaction that logs without declaring meta
  // therefore works only while the cache happens to be warm — and fails on
  // the first write after launch, which is the worst possible time to find
  // out. Checked against the source because the runtime symptom is silent.
  const sources = import.meta.glob('../../store/*.ts', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

  it.each(Object.keys(sources))('%s', (path) => {
    const text = sources[path];
    // Table lists run from `db.transaction(` to the closing `]`.
    const lists = [...text.matchAll(/db\.transaction\(\s*'r?w?'?,?\s*\[([\s\S]*?)\]/g)].map((m) => m[1]);

    const offenders = lists.filter((l) => l.includes('db.auditLog') && !l.includes('db.meta'));
    expect(offenders, `transaction logs but does not declare meta: ${offenders.join(' | ')}`).toEqual([]);
  });
});
