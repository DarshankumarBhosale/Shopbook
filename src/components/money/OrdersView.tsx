import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';
import { useSaleStore } from '../../store/saleStore';
import { Label } from '../common/Label';
import { formatRupees } from '../../lib/format';

export const OrdersView: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const role = useUIStore((state) => state.role);
  const showToast = useUIStore((state) => state.showToast);
  const reverseSale = useSaleStore((state) => state.reverseSale);

  const daySales = useLiveQuery(
    () => (openDay?.id ? db.sales.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];
  const saleLines = useLiveQuery(() => db.saleLines.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];

  const [openFor, setOpenFor] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemName = (id: number) => items.find((i) => i.id === id)?.name ?? `#${id}`;

  const reversedIds = new Set(
    daySales.filter((s) => s.reversesSaleId !== undefined).map((s) => s.reversesSaleId!)
  );

  // Newest first; reversing entries are folded into the sale they cancel.
  const orders = [...daySales]
    .filter((s) => s.reversesSaleId === undefined)
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const handleReverse = async (saleId: number) => {
    if (reason.trim() === '') return;
    try {
      setIsSubmitting(true);
      await reverseSale({ saleId, reason, role });
      showToast('Sale reversed · stock returned');
      setReason('');
      setOpenFor(null);
    } catch (err) {
      console.error('Failed to reverse sale:', err);
      showToast(err instanceof Error ? err.message : 'Could not reverse that sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Label>Today's orders</Label>
      <p className="text-body-s text-tx2 mt-1 mb-3">
        Reversing puts the ingredients back and cancels the amount. Nothing is
        deleted — both the mistake and the correction stay on the record.
      </p>

      {orders.length === 0 ? (
        <div className="py-8 text-center text-body-m text-tx3">
          Nothing rung up yet today.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {orders.map((sale) => {
            const lines = saleLines.filter((l) => l.saleId === sale.id);
            const isReversed = reversedIds.has(sale.id!);

            return (
              <div key={sale.id} className="py-3" style={{ opacity: isReversed ? 0.5 : 1 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body-m text-tx1 truncate">
                      {lines.length > 0
                        ? lines.map((l) => `${l.qty} × ${itemName(l.itemId)}`).join(', ')
                        : 'Sale'}
                    </div>
                    <div className="text-body-s text-tx3">
                      {new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      · {sale.paymentMode}
                      {isReversed && ' · reversed'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="font-mono text-mono-m font-bold"
                      style={{
                        color: isReversed ? 'var(--color-tx3)' : 'var(--color-accent-text)',
                        textDecoration: isReversed ? 'line-through' : 'none',
                      }}
                    >
                      {formatRupees(sale.grossAmount)}
                    </span>

                    {!isReversed && role === 'owner' && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFor(openFor === sale.id ? null : sale.id!)
                        }
                        className="tap min-h-[44px] px-3 rounded-sm border border-line-strong bg-base text-body-s font-semibold text-tx1"
                      >
                        Reverse
                      </button>
                    )}
                  </div>
                </div>

                {openFor === sale.id && (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why? (required)"
                      aria-label="Reason for reversing"
                      className="flex-1 min-h-[44px] rounded-sm px-3 text-body-m bg-base border border-danger text-tx1 placeholder:text-tx3 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleReverse(sale.id!)}
                      disabled={reason.trim() === '' || isSubmitting}
                      className="tap min-h-[44px] px-4 rounded-sm font-display text-[15px] tracking-[0.05em] uppercase disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--color-danger-text)',
                        color: 'var(--color-tx-inverse)',
                      }}
                    >
                      {isSubmitting ? '...' : 'Reverse'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
