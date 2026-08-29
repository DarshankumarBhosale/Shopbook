import { create } from 'zustand';
import { db } from '../db/schema';
import type { Expense, PaymentMode } from '../db/types';
import { toPaise, formatRupees } from '../lib/format';
import { recordAudit } from '../db/audit';

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
      id = await db.expenses.add(expenseRecord as Expense);
      await recordAudit({
        action: 'expense.create',
        detail: `${category} ${formatRupees(amountPaise)} · ${paymentMode}`,
        dayId,
      });
    });

    return id;
  },
}));
