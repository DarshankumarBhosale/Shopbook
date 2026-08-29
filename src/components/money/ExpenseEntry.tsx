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
  const addExpense = useExpenseStore((state) => state.addExpense);

  const [selectedCat, setSelectedCat] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactive query of today's expenses
  const todayExpenses = useLiveQuery(
    () => (openDay?.id ? db.expenses.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];

  const totalSpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

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
              <div key={exp.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-body-m text-tx1 font-medium">{exp.category}</div>
                  <div className="text-body-s text-tx3">
                    {exp.paymentMode}
                    {exp.note ? ` · ${exp.note}` : ''}
                  </div>
                </div>
                <div className="font-mono text-mono-m font-bold text-tx1">
                  {formatRupees(exp.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
