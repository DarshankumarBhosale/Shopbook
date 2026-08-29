import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';
import { useKhataStore } from '../../store/khataStore';
import { Label } from '../common/Label';
import { formatRupees } from '../../lib/format';
import { computeKhataBalances, computeTotalOutstanding } from '../../lib/khata';
import type { PaymentMode } from '../../db/types';

export const KhataView: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const showToast = useUIStore((state) => state.showToast);
  const receivePayment = useKhataStore((state) => state.receivePayment);

  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) || [];

  const [openFor, setOpenFor] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const balances = React.useMemo(
    () => computeKhataBalances(customers, sales, payments),
    [customers, sales, payments]
  );
  const totalOutstanding = computeTotalOutstanding(balances);
  const owing = balances.filter((b) => b.outstandingPaise > 0);

  const handleReceive = async (customerId: number, name: string) => {
    if (!openDay?.id) {
      showToast('Open the day first');
      return;
    }
    if (amount === '' || Number(amount) <= 0) return;

    try {
      setIsSubmitting(true);
      await receivePayment({
        dayId: openDay.id,
        customerId,
        amountRupees: amount,
        paymentMode: mode,
      });
      showToast(`₹${amount} received from ${name}`);
      setAmount('');
      setOpenFor(null);
    } catch (err) {
      console.error('Failed to record payment:', err);
      showToast('Could not record that payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Total on the book */}
      <div className="bg-surface border border-line rounded-md p-4 mb-4">
        <Label>On the khata</Label>
        <div
          className="font-mono text-[32px] leading-tight font-bold"
          style={{
            color: totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)',
          }}
        >
          {formatRupees(totalOutstanding)}
        </div>
        <p className="text-body-s text-tx2 mt-1">
          {owing.length === 0
            ? 'Nobody owes anything right now.'
            : `${owing.length} ${owing.length === 1 ? 'person' : 'people'} to chase before the 9pm close.`}
        </p>
      </div>

      <Label>Everyone on the book</Label>
      <div className="mt-1 divide-y divide-line">
        {balances.map((b) => (
          <div key={b.customerId} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-body-m text-tx1">{b.name}</div>
                <div className="text-body-s text-tx3">
                  {b.phone !== '' ? b.phone : 'No number saved'}
                  {b.daysOutstanding !== null && b.daysOutstanding > 0 && (
                    <> · {b.daysOutstanding}d old</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="font-mono text-mono-m font-bold"
                  style={{
                    color:
                      b.outstandingPaise > 0
                        ? 'var(--color-danger)'
                        : 'var(--color-tx3)',
                  }}
                >
                  {formatRupees(b.outstandingPaise)}
                </span>
                {b.outstandingPaise > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFor(openFor === b.customerId ? null : b.customerId)
                    }
                    className="tap min-h-[44px] px-3 rounded-sm border border-line-strong bg-base text-body-s font-semibold text-tx1"
                  >
                    Receive
                  </button>
                )}
              </div>
            </div>

            {openFor === b.customerId && (
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder={`Up to ${formatRupees(b.outstandingPaise)}`}
                    aria-label={`Amount received from ${b.name}`}
                    className="flex-1 min-h-[44px] rounded-sm px-3 font-mono text-body-m bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleReceive(b.customerId, b.name)}
                    disabled={amount === '' || Number(amount) <= 0 || isSubmitting}
                    className="tap min-h-[44px] px-4 rounded-sm font-display text-[15px] tracking-[0.05em] uppercase disabled:opacity-40"
                    style={{
                      backgroundColor: 'var(--color-marigold)',
                      color: 'var(--color-tx-inverse)',
                    }}
                  >
                    {isSubmitting ? '...' : 'Save'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'UPI'] as PaymentMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className="tap min-h-[44px] rounded-sm border text-body-m font-semibold"
                      style={{
                        backgroundColor:
                          mode === m ? 'var(--color-marigold)' : 'var(--color-base)',
                        borderColor:
                          mode === m ? 'var(--color-marigold)' : 'var(--color-line)',
                        color:
                          mode === m ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
