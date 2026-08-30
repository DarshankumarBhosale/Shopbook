import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../../store/expenseStore';
import { useUIStore } from '../../store/uiStore';
import { BigNum } from '../common/BigNum';
import { Label } from '../common/Label';
import { formatRupees } from '../../lib/format';
import type { PaymentMode } from '../../db/types';

export const ExpenseEntry: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const showToast = useUIStore((state) => state.showToast);
  const role = useUIStore((state) => state.role);
  const { addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenseStore();

  const [selectedCat, setSelectedCat] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing an already-recorded expense, owner only.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ category: '', amount: '', mode: 'Cash' as PaymentMode, note: '' });

  // Reactive query of today's expenses
  const allToday = useLiveQuery(
    () => (openDay?.id ? db.expenses.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];

  const todayExpenses = allToday.filter((e) => !e.isDeleted);
  const deletedToday = allToday.filter((e) => e.isDeleted);
  const totalSpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const beginEdit = (id: number, category: string, amountPaise: number, mode: PaymentMode, n: string) => {
    setEditingId(id);
    setEdit({ category, amount: String(Math.round(amountPaise / 100)), mode, note: n });
  };

  const handleUpdate = async () => {
    if (editingId === null || edit.amount === '' || Number(edit.amount) <= 0) return;
    try {
      setIsSubmitting(true);
      await updateExpense({
        expenseId: editingId,
        category: edit.category,
        amountRupees: edit.amount,
        paymentMode: edit.mode,
        note: edit.note,
        role,
      });
      showToast('Expense updated');
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update expense:', err);
      showToast(err instanceof Error ? err.message : 'Could not update that expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id, role);
      showToast('Expense deleted');
      setEditingId(null);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      showToast(err instanceof Error ? err.message : 'Could not delete that expense');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreExpense(id, role);
      showToast('Expense put back');
    } catch (err) {
      console.error('Failed to restore expense:', err);
      showToast('Could not put that back');
    }
  };

  const handleSaveExpense = async () => {
    if (!openDay?.id) {
      showToast('No active day');
      return;
    }
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsSubmitting(true);
      await addExpense({
        dayId: openDay.id,
        category: selectedCat,
        amountRupees: amount,
        paymentMode,
        note,
      });
      setAmount('');
      setNote('');
      showToast('Expense saved');
    } catch (err) {
      console.error(err);
      showToast('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* The one repeating cost: two ₹1,000 cylinders a month. */}
      <div className="mb-4">
        <Label>Quick add</Label>
        <button
          type="button"
          onClick={() => {
            setSelectedCat('Gas cylinder');
            setAmount('1000');
            setPaymentMode('Cash');
          }}
          className="tap mt-1 min-h-[44px] w-full rounded-md border border-line-strong bg-surface px-4 text-body-m font-semibold text-tx1"
        >
          Gas cylinder · ₹1,000
        </button>
      </div>

      {/* Category selector chips */}
      <div className="mb-4">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EXPENSE_CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className="tap rounded-full px-3 py-1.5 text-body-s font-semibold border transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-line)',
                  color: isSelected ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <Label>Amount (₹)</Label>
        <BigNum value={amount} onChange={setAmount} placeholder="0" />
      </div>

      {/* Payment mode toggle (Cash / UPI) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(['Cash', 'UPI'] as PaymentMode[]).map((m) => {
          const isSelected = paymentMode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMode(m)}
              className="tap py-3 rounded-md font-display text-[16px] tracking-[0.05em] uppercase border transition-colors"
              style={{
                backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-line)',
                color: isSelected ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Optional Note input */}
      <div className="mb-4">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-md px-3.5 py-3 text-body-m bg-surface border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSaveExpense}
        disabled={!amount || Number(amount) <= 0 || isSubmitting}
        className="tap w-full h-[52px] rounded-md font-display text-[18px] tracking-[0.05em] uppercase flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-6"
        style={{
          backgroundColor: amount ? 'var(--color-accent)' : 'var(--color-surface)',
          color: amount ? 'var(--color-tx-on-accent)' : 'var(--color-tx3)',
          border: `1px solid ${amount ? 'var(--color-accent)' : 'var(--color-line)'}`,
        }}
      >
        {isSubmitting ? 'SAVING...' : 'SAVE EXPENSE'}
      </button>

      {/* Today's Expense Ledger */}
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-line mb-1">
          <Label className="mb-0">Spent today</Label>
          <span className="font-mono text-mono-m font-bold text-tx1">
            {formatRupees(totalSpent)}
          </span>
        </div>

        {todayExpenses.length === 0 ? (
          <div className="py-6 text-center text-body-m text-tx3">
            Nothing spent yet today.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {[...todayExpenses].reverse().map((exp) => (
              <div key={exp.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body-m text-tx1 font-medium">{exp.category}</div>
                    <div className="text-body-s text-tx3">
                      {exp.paymentMode}
                      {exp.note ? ` · ${exp.note}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-mono text-mono-m font-bold text-tx1">
                      {formatRupees(exp.amount)}
                    </div>
                    {role === 'owner' && (
                      <button
                        type="button"
                        onClick={() =>
                          editingId === exp.id
                            ? setEditingId(null)
                            : beginEdit(exp.id!, exp.category, exp.amount, exp.paymentMode, exp.note)
                        }
                        aria-label={`Edit ${exp.category} expense`}
                        className="tap min-h-[44px] px-3 rounded-sm border border-line-strong bg-base text-body-s font-semibold text-tx1"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editingId === exp.id && (
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex flex-wrap gap-2">
                      {EXPENSE_CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEdit({ ...edit, category: c })}
                          className="tap min-h-[44px] rounded-full px-3 text-body-s font-semibold border"
                          style={{
                            backgroundColor:
                              edit.category === c ? 'var(--color-primary)' : 'var(--color-base)',
                            borderColor:
                              edit.category === c ? 'var(--color-primary)' : 'var(--color-line)',
                            color:
                              edit.category === c ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={edit.amount}
                        onChange={(e) => setEdit({ ...edit, amount: e.target.value.replace(/\D/g, '') })}
                        aria-label="Edited amount"
                        className="flex-1 min-h-[44px] rounded-sm px-3 font-mono text-body-m bg-base border border-line text-tx1 focus:border-line-strong focus:outline-none"
                      />
                      {(['Cash', 'UPI'] as PaymentMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEdit({ ...edit, mode: m })}
                          className="tap min-h-[44px] px-3 rounded-sm border text-body-m font-semibold"
                          style={{
                            backgroundColor:
                              edit.mode === m ? 'var(--color-primary)' : 'var(--color-base)',
                            borderColor:
                              edit.mode === m ? 'var(--color-primary)' : 'var(--color-line)',
                            color:
                              edit.mode === m ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={edit.note}
                      onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                      placeholder="Note (optional)"
                      aria-label="Edited note"
                      className="min-h-[44px] rounded-sm px-3 text-body-m bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={edit.amount === '' || isSubmitting}
                        className="tap flex-1 min-h-[44px] rounded-sm font-display text-[15px] tracking-[0.05em] uppercase disabled:opacity-40"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-tx-on-accent)',
                        }}
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id!)}
                        className="tap min-h-[44px] px-4 rounded-sm font-display text-[15px] tracking-[0.05em] uppercase"
                        style={{
                          backgroundColor: 'var(--color-danger-text)',
                          color: 'var(--color-tx-inverse)',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Deleted today — out of every total, but not erased */}
        {role === 'owner' && deletedToday.length > 0 && (
          <div className="mt-4">
            <Label>Deleted today</Label>
            <p className="text-body-s text-tx3 mt-1 mb-1">
              Not counted anywhere. Kept so the day can still be explained.
            </p>
            <div className="divide-y divide-line">
              {deletedToday.map((exp) => (
                <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body-m text-tx3 line-through truncate">
                      {exp.category} · {formatRupees(exp.amount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(exp.id!)}
                    className="tap min-h-[44px] px-3 rounded-sm border border-line-strong bg-base text-body-s font-semibold text-tx1 shrink-0"
                  >
                    Put back
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
