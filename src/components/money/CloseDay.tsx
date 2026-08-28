import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';
import { BigNum } from '../common/BigNum';
import { Label } from '../common/Label';
import { computeExpectedCash, computeVariance, isReconciliationValid } from '../../lib/cashRecon';
import { formatRupees, toPaise } from '../../lib/format';

export const CloseDay: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const closeCurrentDay = useDayStore((state) => state.closeCurrentDay);
  const showToast = useUIStore((state) => state.showToast);

  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactive data for Day's transactions
  const daySales = useLiveQuery(
    () => (openDay?.id ? db.sales.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];

  const dayExpenses = useLiveQuery(
    () => (openDay?.id ? db.expenses.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];

  // Totals in paise
  const cashSalesPaise = daySales
    .filter((s) => s.paymentMode === 'Cash')
    .reduce((sum, s) => sum + s.grossAmount, 0);

  const cashExpensesPaise = dayExpenses
    .filter((e) => e.paymentMode === 'Cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalGrossSalesPaise = daySales.reduce((sum, s) => sum + s.grossAmount, 0);
  const totalCogsPaise = daySales.reduce((sum, s) => sum + s.cogs, 0);
  const totalExpensesPaise = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openingCashPaise = openDay?.openingCash || 0;
  const expectedCashPaise = computeExpectedCash(
    openingCashPaise,
    cashSalesPaise,
    cashExpensesPaise
  );

  const countedPaise = counted !== '' ? toPaise(counted) : null;
  const variancePaise =
    countedPaise !== null ? computeVariance(expectedCashPaise, countedPaise) : null;

  const isValid = isReconciliationValid(counted, expectedCashPaise, note);

  const handleLockDay = async () => {
    if (!isValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await closeCurrentDay(counted, expectedCashPaise, note, {
        grossSalesPaise: totalGrossSalesPaise,
        cogsPaise: totalCogsPaise,
        expensesPaise: totalExpensesPaise,
      });
      showToast('Day locked');
    } catch (err) {
      console.error('Failed to close day:', err);
      showToast('Failed to lock day');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Reconciliation Drawer Math Card */}
      <div className="bg-surface border border-line rounded-md p-4 mb-4">
        <div className="flex items-baseline justify-between py-1 text-body-m">
          <span className="text-tx2">Opening cash</span>
          <span className="font-mono text-tx1 font-medium">
            {formatRupees(openingCashPaise)}
          </span>
        </div>

        <div className="flex items-baseline justify-between py-1 text-body-m">
          <span className="text-tx2">Cash sales</span>
          <span className="font-mono text-tx1 font-medium">
            + {formatRupees(cashSalesPaise)}
          </span>
        </div>

        <div className="flex items-baseline justify-between py-1 text-body-m">
          <span className="text-tx2">Cash expenses</span>
          <span className="font-mono text-tx1 font-medium">
            − {formatRupees(cashExpensesPaise)}
          </span>
        </div>

        <div className="border-t border-line mt-2 pt-2 flex items-baseline justify-between">
          <span className="text-body-m font-semibold text-tx1">Drawer should hold</span>
          <span className="font-mono text-mono-l font-bold text-marigold">
            {formatRupees(expectedCashPaise)}
          </span>
        </div>
      </div>

      {/* Counted Cash Entry */}
      <div className="mb-2">
        <Label>Now count it (₹)</Label>
        <BigNum
          value={counted}
          onChange={setCounted}
          placeholder="0"
          color="var(--color-tx1)"
        />
      </div>

      {/* Variance Alert & Mandatory Note */}
      {variancePaise !== null && variancePaise !== 0 && (
        <div className="bg-surface border border-danger rounded-md p-3.5 my-3">
          <div className="font-display text-[18px] tracking-[0.04em] uppercase text-danger">
            {variancePaise > 0 ? 'Excess ' : 'Short '}
            {formatRupees(Math.abs(variancePaise))}
          </div>
          <p className="text-body-s text-tx2 mt-1 mb-2">
            A note explaining the cash mismatch is required to close the day.
          </p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? (required)"
            className="w-full rounded bg-base border border-line px-3 py-2 text-body-m text-tx1 focus:border-danger focus:outline-none"
          />
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleLockDay}
        disabled={!isValid || isSubmitting}
        className="tap w-full h-[52px] rounded-md font-display text-[19px] tracking-[0.06em] uppercase flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-4 mb-6"
        style={{
          backgroundColor: isValid ? 'var(--color-marigold)' : 'var(--color-surface)',
          color: isValid ? 'var(--color-tx-inverse)' : 'var(--color-tx3)',
          border: `1px solid ${isValid ? 'var(--color-marigold)' : 'var(--color-line)'}`,
        }}
      >
        {isSubmitting ? 'LOCKING...' : 'LOCK THE DAY'}
      </button>
    </div>
  );
};
