import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../schema';
import { seedDatabaseIfEmpty } from '../seed';
import { resetDeviceCache, setDeviceNo } from '../ids';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useKhataStore } from '../../store/khataStore';
import { useStockStore } from '../../store/stockStore';

/**
 * Closing a day is a reconciliation the owner signs off: cash counted against
 * cash expected, with the day's sales, cost and expenses stored beside it.
 *
 * Anything written to that day afterwards silently invalidates it — the totals
 * stop matching the stored snapshot and the next morning's figures disagree
 * with nothing to explain why. The guard existed but had only been wired to
 * reversals and expense edits; a late sale, a khata payment or a stock entry
 * all still went through. Every write is covered here so the next one added
 * can't quietly miss it.
 */

const VADA = 11;

async function freshDay() {
  await db.delete();
  await db.open();
  resetDeviceCache();
  await seedDatabaseIfEmpty();
  await setDeviceNo(1, 'owner');
  useDayStore.setState({ openDay: null, isLoading: false });
  useSaleStore.setState({ cart: {} });
  return useDayStore.getState().openNewDay(500);
}

async function closeIt(dayId: number) {
  await useDayStore.getState().closeCurrentDay(
    500, 50000, '', { grossSalesPaise: 0, cogsPaise: 0, expensesPaise: 0 }, 'owner'
  );
  const day = await db.dayBook.get(dayId);
  expect(day?.status).toBe('closed');
}

describe('a closed day refuses every kind of write', () => {
  let dayId: number;

  beforeEach(async () => {
    const day = await freshDay();
    dayId = day.id!;
    await closeIt(dayId);
  });

  it('refuses a sale', async () => {
    useSaleStore.getState().addToCart(VADA);
    await expect(
      useSaleStore.getState().commitSale({ dayId, paymentMode: 'Cash', createdBy: 'owner' })
    ).rejects.toThrow(/locked/i);
    expect(await db.sales.count()).toBe(0);
  });

  it('refuses an expense', async () => {
    await expect(
      useExpenseStore.getState().addExpense({
        dayId, category: 'Gas cylinder', amountRupees: 1000, paymentMode: 'Cash',
      })
    ).rejects.toThrow(/locked/i);
    expect(await db.expenses.count()).toBe(0);
  });

  it('refuses a khata payment', async () => {
    const customer = (await db.customers.toArray())[0];
    await expect(
      useKhataStore.getState().receivePayment({
        dayId, customerId: customer.id!, amountRupees: 200, paymentMode: 'Cash',
      })
    ).rejects.toThrow(/locked/i);
    expect(await db.payments.count()).toBe(0);
  });

  it('refuses stock bought in', async () => {
    const before = await db.stockMoves.count();
    await expect(
      useStockStore.getState().recordStockIn({ dayId, rmId: 1, qty: 5, ratePaise: 4000 })
    ).rejects.toThrow(/locked/i);
    expect(await db.stockMoves.count()).toBe(before);
  });

  it('refuses wastage', async () => {
    const before = await db.stockMoves.count();
    await expect(
      useStockStore.getState().recordWastage({ dayId, rmId: 1, qty: 2, reason: 'Spoiled' })
    ).rejects.toThrow(/locked/i);
    expect(await db.stockMoves.count()).toBe(before);
  });
});

describe('an open day accepts all of them', () => {
  let dayId: number;

  beforeEach(async () => {
    const day = await freshDay();
    dayId = day.id!;
  });

  it('takes a sale, an expense, a payment and stock', async () => {
    useSaleStore.getState().addToCart(VADA);
    await useSaleStore.getState().commitSale({ dayId, paymentMode: 'Cash', createdBy: 'owner' });

    await useExpenseStore.getState().addExpense({
      dayId, category: 'Gas cylinder', amountRupees: 1000, paymentMode: 'Cash',
    });

    const customer = (await db.customers.toArray())[0];
    await useKhataStore.getState().receivePayment({
      dayId, customerId: customer.id!, amountRupees: 200, paymentMode: 'Cash',
    });

    await useStockStore.getState().recordStockIn({ dayId, rmId: 1, qty: 5, ratePaise: 4000 });

    expect(await db.sales.count()).toBe(1);
    expect(await db.expenses.count()).toBeGreaterThanOrEqual(1);
    expect(await db.payments.count()).toBe(1);
  });

  it('takes them again once a closed day is reopened', async () => {
    await closeIt(dayId);
    await useDayStore.getState().reopenDay(dayId, 'owner');

    useSaleStore.getState().addToCart(VADA);
    await useSaleStore.getState().commitSale({ dayId, paymentMode: 'Cash', createdBy: 'owner' });
    expect(await db.sales.count()).toBe(1);
  });
});

describe('opening stock, which belongs to no day', () => {
  it('is still allowed', async () => {
    // The seeder records opening stock with no day at all. If the guard
    // treated a missing day as a closed one, a fresh install would fail to
    // seed and the shop would open to an empty shelf.
    await db.delete();
    await db.open();
    resetDeviceCache();
    await seedDatabaseIfEmpty();

    const opening = await db.stockMoves.filter((m) => m.dayId == null).count();
    expect(opening).toBeGreaterThan(0);
  });

  it('lets the guard pass a day that is null or undefined', async () => {
    const { assertDayOpenIfGiven } = await import('../dayGuard');
    await expect(assertDayOpenIfGiven(null)).resolves.toBeUndefined();
    await expect(assertDayOpenIfGiven(undefined)).resolves.toBeUndefined();
  });
});
