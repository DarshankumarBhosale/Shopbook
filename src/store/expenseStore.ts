import { create } from 'zustand';
import { db } from '../db/schema';
import { nextId } from '../db/ids';
import type { Expense, PaymentMode } from '../db/types';
import { toPaise, formatRupees } from '../lib/format';
import { recordAudit } from '../db/audit';
import { assertOwner, type Role } from '../lib/permissions';

export const EXPENSE_CATEGORIES = [
  'Raw material',
  'Gas cylinder',
  'Packaging',
  'Salary',
  'Electricity',
  'Rent',
  'Repairs',
  'Misc',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

interface ExpenseState {
  addExpense: (params: {
    dayId: number;
    category: string;
    amountRupees: number | string;
    paymentMode: PaymentMode;
    note?: string;
  }) => Promise<number>; // returns expense id
  updateExpense: (params: {
    expenseId: number;
    category: string;
    amountRupees: number | string;
    paymentMode: PaymentMode;
    note?: string;
    role: Role | null;
  }) => Promise<void>;
  deleteExpense: (expenseId: number, role: Role | null) => Promise<void>;
  restoreExpense: (expenseId: number, role: Role | null) => Promise<void>;
}

/** A closed day is immutable — its expenses are part of a locked cash count. */
async function assertDayOpen(dayId: number): Promise<void> {
  const day = await db.dayBook.get(dayId);
  if (!day || day.status !== 'open') {
    throw new Error('That day is locked — reopen it first');
  }
}

export const useExpenseStore = create<ExpenseState>(() => ({
  addExpense: async ({ dayId, category, amountRupees, paymentMode, note }) => {
    const amountPaise = toPaise(amountRupees);
    if (amountPaise <= 0) throw new Error('Expense amount must be greater than zero');

    const expenseRecord: Omit<Expense, 'id'> = {
      dayId,
      category,
      amount: amountPaise,
      paymentMode,
      note: (note || '').trim(),
    };

    let id = 0;
    await db.transaction('rw', [db.expenses, db.auditLog], async () => {
      id = await db.expenses.add({ ...expenseRecord, id: await nextId(db.expenses) } as Expense);
      await recordAudit({
        action: 'expense.create',
        detail: `${category} ${formatRupees(amountPaise)} · ${paymentMode}`,
        dayId,
      });
    });

    return id;
  },

  updateExpense: async ({ expenseId, category, amountRupees, paymentMode, note, role }) => {
    assertOwner(role, 'editExpense');

    const amountPaise = toPaise(amountRupees);
    if (amountPaise <= 0) throw new Error('Expense amount must be greater than zero');

    await db.transaction('rw', [db.expenses, db.dayBook, db.auditLog], async () => {
      const before = await db.expenses.get(expenseId);
      if (!before) throw new Error('That expense no longer exists');
      await assertDayOpen(before.dayId);

      await db.expenses.update(expenseId, {
        category,
        amount: amountPaise,
        paymentMode,
        note: (note || '').trim(),
      });

      await recordAudit({
        action: 'expense.edit',
        detail:
          `${before.category} ${formatRupees(before.amount)} (${before.paymentMode}) → ` +
          `${category} ${formatRupees(amountPaise)} (${paymentMode})`,
        role,
        dayId: before.dayId,
      });
    });
  },

  /**
   * Drops an expense out of every total without erasing it. The row and the
   * audit entry stay, so the books still show what was entered and undone.
   */
  deleteExpense: async (expenseId, role) => {
    assertOwner(role, 'editExpense');

    await db.transaction('rw', [db.expenses, db.dayBook, db.auditLog], async () => {
      const before = await db.expenses.get(expenseId);
      if (!before) throw new Error('That expense no longer exists');
      await assertDayOpen(before.dayId);

      await db.expenses.update(expenseId, { isDeleted: true });
      await recordAudit({
        action: 'expense.delete',
        detail: `${before.category} ${formatRupees(before.amount)} deleted`,
        role,
        dayId: before.dayId,
      });
    });
  },

  restoreExpense: async (expenseId, role) => {
    assertOwner(role, 'editExpense');

    await db.transaction('rw', [db.expenses, db.dayBook, db.auditLog], async () => {
      const before = await db.expenses.get(expenseId);
      if (!before) throw new Error('That expense no longer exists');
      await assertDayOpen(before.dayId);

      await db.expenses.update(expenseId, { isDeleted: false });
      await recordAudit({
        action: 'expense.restore',
        detail: `${before.category} ${formatRupees(before.amount)} restored`,
        role,
        dayId: before.dayId,
      });
    });
  },
}));
