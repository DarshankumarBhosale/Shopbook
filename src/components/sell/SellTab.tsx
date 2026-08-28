import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus } from 'lucide-react';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useUIStore } from '../../store/uiStore';
import { ItemTile } from '../common/ItemTile';
import { Label } from '../common/Label';
import { formatRupees, formatRupeesRaw } from '../../lib/format';
import type { PaymentMode } from '../../db/types';

export const SellTab: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const role = useUIStore((state) => state.role);
  const showToast = useUIStore((state) => state.showToast);
  const { cart, addToCart, decrementFromCart, commitSale } = useSaleStore();

  const cartSheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState<number>(0);

  // Reactive queries from Dexie
  const items = useLiveQuery(() => db.items.filter((i) => i.isActive).toArray(), []) || [];
  const daySales = useLiveQuery(
    () => (openDay?.id ? db.sales.where('dayId').equals(openDay.id).toArray() : []),
    [openDay?.id]
  ) || [];

  // Strictly sort by sortOrder (position stability - never re-sorts from sales data)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.sortOrder ?? a.id ?? 0) - (b.sortOrder ?? b.id ?? 0));
  }, [items]);

  // Derived sales metrics for today
  const salesSummary = useMemo(() => {
    let gross = 0;
    let cash = 0;
    let upi = 0;
    for (const sale of daySales) {
      gross += sale.grossAmount;
      if (sale.paymentMode === 'Cash') cash += sale.grossAmount;
      if (sale.paymentMode === 'UPI') upi += sale.grossAmount;
    }
    return {
      gross,
      cash,
      upi,
      orders: daySales.length,
    };
  }, [daySales]);

  // Cart calculations
  const cartLines = useMemo(() => {
    return Object.entries(cart).map(([idStr, qty]) => {
      const itemId = Number(idStr);
      const item = items.find((i) => i.id === itemId);
      const rate = item ? item.sellPriceCounter : 0;
      const amount = rate * qty;
      return {
        itemId,
        name: item ? item.name : `Item #${itemId}`,
        qty,
        rate,
        amount,
      };
    });
  }, [cart, items]);

  const cartGross = cartLines.reduce((sum, line) => sum + line.amount, 0);
  const totalCartCount = cartLines.reduce((sum, line) => sum + line.qty, 0);

  // Measure cart sheet height dynamically with ResizeObserver
  useEffect(() => {
    const el = cartSheetRef.current;
    if (!el) {
      setSheetHeight(0);
      return;
    }

    setSheetHeight(el.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
          setSheetHeight(entry.borderBoxSize[0].blockSize);
        } else {
          setSheetHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [totalCartCount > 0, cartLines.length]);

  const handlePayment = async (paymentMode: PaymentMode) => {
    if (!openDay?.id) {
      showToast('No active day found');
      return;
    }
    if (totalCartCount === 0) return;

    try {
      const grossPaise = await commitSale({
        dayId: openDay.id,
        paymentMode,
        createdBy: role || 'user',
      });
      showToast(`${formatRupees(grossPaise)} recorded · stock deducted`);
    } catch (err) {
      console.error('Failed to commit sale:', err);
      showToast('Failed to record sale');
    }
  };

  // Dynamic bottom padding: tab bar height (62px) + exact measured sheet height + 16px margin
  const dynamicBottomPadding = totalCartCount > 0 ? `${sheetHeight + 62 + 16}px` : '76px';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Compact 48px Sales summary strip */}
      <section className="px-4 py-2 border-b border-line bg-surface/30 select-none flex items-center justify-between shrink-0 h-[48px]">
        <div className="flex items-baseline gap-2">
          <Label className="mb-0">Sales</Label>
          <span className="font-mono text-mono-l font-bold text-marigold">
            {formatRupees(salesSummary.gross)}
          </span>
        </div>
        <div className="text-body-s text-tx2 font-mono">
          <span>{salesSummary.orders}</span> ord ·{' '}
          <span>{formatRupees(salesSummary.cash)}</span> cash ·{' '}
          <span>{formatRupees(salesSummary.upi)}</span> UPI
        </div>
      </section>

      {/* Menu item board grid - dynamically padded with exact measured cart sheet height */}
      <section
        className="px-3 pt-2 overflow-y-auto noscroll transition-[padding] duration-150"
        style={{
          paddingBottom: dynamicBottomPadding,
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          {sortedItems.map((item) => {
            const qtyInCart = item.id ? cart[item.id] || 0 : 0;
            return (
              <ItemTile
                key={item.id}
                id={item.id!}
                name={item.name}
                pricePaise={item.sellPriceCounter}
                quantity={qtyInCart}
                onSelect={() => item.id && addToCart(item.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Bottom Cart Sheet (measured via ref and ResizeObserver) */}
      {totalCartCount > 0 && (
        <div
          ref={cartSheetRef}
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-md bg-surface border-t-2 z-40 px-4 pt-3 pb-4 shadow-2xl transition-transform"
          style={{
            bottom: '62px',
            borderColor: 'var(--color-marigold)',
          }}
        >
          {/* Cart item rows */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 max-h-[88px] overflow-y-auto noscroll pr-1">
              {cartLines.map((l) => (
                <div
                  key={l.itemId}
                  className="flex items-center justify-between py-1 text-body-m"
                >
                  <span className="text-tx1 font-medium truncate mr-2">
                    {l.qty} × {l.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-body-s text-tx2">
                      {formatRupees(l.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => decrementFromCart(l.itemId)}
                      aria-label={`Remove one ${l.name}`}
                      className="tap w-6 h-6 rounded bg-base border border-line flex items-center justify-center text-danger hover:border-danger/60 active:scale-95"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Running total */}
            <div className="font-mono text-[28px] font-bold text-marigold shrink-0">
              {formatRupeesRaw(cartGross / 100)}
            </div>
          </div>

          {/* Payment action buttons (52px tall per design spec) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePayment('Cash')}
              className="tap h-[52px] rounded-md font-display text-[18px] tracking-[0.05em] uppercase flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--color-marigold)',
                color: 'var(--color-tx-inverse)',
              }}
            >
              CASH
            </button>
            <button
              type="button"
              onClick={() => handlePayment('UPI')}
              className="tap h-[52px] rounded-md font-display text-[18px] tracking-[0.05em] uppercase flex items-center justify-center border transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--color-base)',
                borderColor: 'var(--color-marigold)',
                color: 'var(--color-tx1)',
              }}
            >
              UPI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
