import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useExpenseStore } from '../../store/expenseStore';
import { computeCurrentStock } from '../stockMoves';
import { computeExpectedCash, computeVariance } from '../cashRecon';

describe('Phase 1 Full Day Operational Flow', () => {
  beforeEach(async () => {
    // Clear and re-seed in-memory indexedDB
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });
  });

  it('completes the entire day-book lifecycle: seed -> open -> 2 Vada Pav sale -> ₹400 expense -> close & reconcile', async () => {
    // 1. Verify Seed Data
    const rawMaterialsCount = await db.rawMaterials.count();
    const itemsCount = await db.items.count();
    const recipesCount = await db.recipes.count();

    expect(rawMaterialsCount).toBe(32);
    expect(itemsCount).toBe(25);
    expect(recipesCount).toBeGreaterThan(100);

    // Initial stock for Pav (rmId: 1, reorder: 100 * 1.6 = 160)
    const initialMoves = await db.stockMoves.where('rmId').equals(1).toArray();
    expect(computeCurrentStock(initialMoves, 1)).toBe(160);

    // 2. Step 1: Open Day with ₹2,000 opening cash
    const openDay = await useDayStore.getState().openNewDay(2000);
    expect(openDay).toBeDefined();
    expect(openDay.openingCash).toBe(200000); // 200,000 paise
    expect(openDay.status).toBe('open');

    // 3. Step 2: Sell two Vada Pav on Cash
    // Vada Pav id is 11, counter price is ₹15 (1500 paise)
    useSaleStore.getState().addToCart(11);
    useSaleStore.getState().addToCart(11);
    expect(useSaleStore.getState().cart[11]).toBe(2);

    const grossPaise = await useSaleStore.getState().commitSale({
      dayId: openDay.id!,
      paymentMode: 'Cash',
      createdBy: 'owner',
    });

    expect(grossPaise).toBe(3000); // 3000 paise = ₹30
    expect(useSaleStore.getState().cart).toEqual({});

    // Verify Sale record
    const sales = await db.sales.where('dayId').equals(openDay.id!).toArray();
    expect(sales).toHaveLength(1);
    expect(sales[0].grossAmount).toBe(3000);
    expect(sales[0].paymentMode).toBe('Cash');

    // Verify Stock deduction for Pav: 160 - 2 = 158
    const updatedPavMoves = await db.stockMoves.where('rmId').equals(1).toArray();
    expect(computeCurrentStock(updatedPavMoves, 1)).toBe(158);

    // 4. Step 3: Add ₹400 Raw Material expense on Cash
    await useExpenseStore.getState().addExpense({
      dayId: openDay.id!,
      category: 'Raw material',
      amountRupees: 400,
      paymentMode: 'Cash',
      note: 'Fresh Pav & Potatoes',
    });

    const expenses = await db.expenses.where('dayId').equals(openDay.id!).toArray();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(40000); // 40,000 paise = ₹400
    expect(expenses[0].paymentMode).toBe('Cash');

    // 5. Step 4: Close and Reconcile Cash
    // Expected: Opening (200,000) + Cash Sales (3,000) - Cash Expenses (40,000) = 163,000 paise (₹1,630)
    const expectedPaise = computeExpectedCash(openDay.openingCash, 3000, 40000, 0);
    expect(expectedPaise).toBe(163000);

    const countedRupees = 1630;
    const countedPaise = countedRupees * 100;
    const variance = computeVariance(expectedPaise, countedPaise);
    expect(variance).toBe(0);

    await useDayStore.getState().closeCurrentDay(
      countedRupees,
      expectedPaise,
      '',
      {
        grossSalesPaise: 3000,
        cogsPaise: sales[0].cogs,
        expensesPaise: 40000,
      }
    );

    // 6. Verify Day Book record is now locked and closed
    const closedDay = await db.dayBook.get(openDay.id!);
    expect(closedDay).toBeDefined();
    expect(closedDay!.status).toBe('closed');
    expect(closedDay!.closingCashExpected).toBe(163000);
    expect(closedDay!.closingCashCounted).toBe(163000);
    expect(closedDay!.variance).toBe(0);
    expect(closedDay!.closedAt).toBeDefined();
    expect(useDayStore.getState().openDay).toBeNull();
  });
});
