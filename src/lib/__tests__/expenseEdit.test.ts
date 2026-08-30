import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useDayStore } from '../../store/dayStore';
import { useExpenseStore } from '../../store/expenseStore';
import { PermissionError } from '../permissions';

describe('editing and deleting an expense', () => {
  let dayId: number;
  let expenseId: number;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });

    const day = await useDayStore.getState().openNewDay(900);
    dayId = day.id!;
    expenseId = await useExpenseStore.getState().addExpense({
      dayId, category: 'Misc', amountRupees: 100, paymentMode: 'Cash', note: 'first',
    });
  });

  it('updates the amount, category and mode', async () => {
    await useExpenseStore.getState().updateExpense({
      expenseId, category: 'Gas cylinder', amountRupees: 1000,
      paymentMode: 'UPI', note: 'corrected', role: 'owner',
    });

    const e = await db.expenses.get(expenseId);
    expect(e!.amount).toBe(100000);
    expect(e!.category).toBe('Gas cylinder');
    expect(e!.paymentMode).toBe('UPI');
    expect(e!.note).toBe('corrected');
  });

  it('keeps the row on delete but drops it from the live set', async () => {
    await useExpenseStore.getState().deleteExpense(expenseId, 'owner');

    const row = await db.expenses.get(expenseId);
    expect(row).toBeDefined();
    expect(row!.isDeleted).toBe(true);
    expect(row!.amount).toBe(10000);

    const live = await db.expenses.filter((x) => !x.isDeleted).toArray();
    expect(live).toHaveLength(0);
  });

  it('can be put back', async () => {
    await useExpenseStore.getState().deleteExpense(expenseId, 'owner');
    await useExpenseStore.getState().restoreExpense(expenseId, 'owner');
    const row = await db.expenses.get(expenseId);
    expect(row!.isDeleted).toBe(false);
  });

  it('writes what changed to the audit log', async () => {
    await useExpenseStore.getState().updateExpense({
      expenseId, category: 'Misc', amountRupees: 250,
      paymentMode: 'Cash', role: 'owner',
    });
    const entries = await db.auditLog.filter((a) => a.action === 'expense.edit').toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].detail).toContain('₹100');
    expect(entries[0].detail).toContain('₹250');
  });

  it('refuses a helper', async () => {
    await expect(
      useExpenseStore.getState().updateExpense({
        expenseId, category: 'Misc', amountRupees: 5,
        paymentMode: 'Cash', role: 'helper',
      })
    ).rejects.toThrow(PermissionError);

    await expect(
      useExpenseStore.getState().deleteExpense(expenseId, 'helper')
    ).rejects.toThrow(PermissionError);
  });

  it('refuses to touch an expense on a locked day', async () => {
    await useDayStore.getState().closeCurrentDay(
      900, 90000, '', { grossSalesPaise: 0, cogsPaise: 0, expensesPaise: 10000 }, 'owner'
    );

    await expect(
      useExpenseStore.getState().deleteExpense(expenseId, 'owner')
    ).rejects.toThrow(/locked/);
  });
});
