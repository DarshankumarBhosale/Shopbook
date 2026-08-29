import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';
import { useStockStore, WASTAGE_REASONS } from '../../store/stockStore';
import { computeAllStock, computeLowStock } from '../../lib/stockMoves';
import { Label } from '../common/Label';
import { formatRupees, formatUnitRate } from '../../lib/format';

type Sheet = 'in' | 'waste' | 'audit' | null;

export const StockTab: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const showToast = useUIStore((state) => state.showToast);
  const { recordStockIn, recordWastage, recordAudit } = useStockStore();

  const rawMaterials = useLiveQuery(() => db.rawMaterials.toArray(), []) || [];
  const stockMoves = useLiveQuery(() => db.stockMoves.toArray(), []) || [];

  const stockMap = React.useMemo(
    () => computeAllStock(stockMoves, rawMaterials),
    [stockMoves, rawMaterials]
  );
  const lowStock = React.useMemo(
    () => computeLowStock(rawMaterials, stockMap),
    [rawMaterials, stockMap]
  );
  const sortedMaterials = React.useMemo(
    () => [...rawMaterials].sort((a, b) => a.name.localeCompare(b.name)),
    [rawMaterials]
  );

  const [sheet, setSheet] = useState<Sheet>(null);
  const [rmId, setRmId] = useState<string>('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState<string>(WASTAGE_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeSheet = () => {
    setSheet(null);
    setRmId('');
    setQty('');
    setRate('');
    setReason(WASTAGE_REASONS[0]);
  };

  const openSheet = (next: Sheet) => {
    setSheet(next);
    setRmId('');
    setQty('');
    setRate('');
  };

  const handleSubmit = async () => {
    if (!openDay?.id) {
      showToast('No active day found');
      return;
    }
    const id = Number(rmId);
    const q = Number(qty);
    if (!id || !qty || isNaN(q) || q <= 0) return;

    try {
      setIsSubmitting(true);
      if (sheet === 'in') {
        const ratePaise = rate !== '' ? Math.round(Number(rate) * 100) : undefined;
        await recordStockIn({ dayId: openDay.id, rmId: id, qty: q, ratePaise });
        showToast(rate !== '' ? 'Stock added · expense logged' : 'Stock added');
      } else if (sheet === 'waste') {
        await recordWastage({ dayId: openDay.id, rmId: id, qty: q, reason });
        showToast('Wastage recorded');
      } else if (sheet === 'audit') {
        await recordAudit({ dayId: openDay.id, rmId: id, countedQty: q, currentQty: stockMap[id] ?? 0 });
        showToast('Count adjusted');
      }
      closeSheet();
    } catch (err) {
      console.error('Stock action failed:', err);
      showToast('Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetTitle =
    sheet === 'in' ? 'Stock in' : sheet === 'waste' ? 'Log wastage' : 'Physical count';

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {(
          [
            ['in', 'Stock in'],
            ['waste', 'Wastage'],
            ['audit', 'Count'],
          ] as [Sheet, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => openSheet(id)}
            className="tap flex-1 py-2.5 rounded-md text-[13px] font-bold border transition-colors"
            style={{
              backgroundColor: sheet === id ? 'var(--color-marigold)' : 'var(--color-surface)',
              borderColor: sheet === id ? 'var(--color-marigold)' : 'var(--color-line)',
              color: sheet === id ? 'var(--color-tx-inverse)' : 'var(--color-tx2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Low stock banner */}
      {lowStock.length > 0 && (
        <div className="bg-surface border border-danger rounded-md p-3.5 mb-4">
          <div className="font-display text-[16px] tracking-[0.04em] uppercase text-danger">
            Buy today — {lowStock.length} item{lowStock.length > 1 ? 's' : ''}
          </div>
          <p className="text-body-s text-tx2 mt-1">{lowStock.map((r) => r.name).join(' · ')}</p>
        </div>
      )}

      {/* Sheet form */}
      {sheet && (
        <div className="bg-surface border border-line-strong rounded-md p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-[18px] tracking-[0.04em] uppercase text-tx1">
              {sheetTitle}
            </span>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Close"
              className="tap text-tx3 text-[18px] leading-none"
            >
              ×
            </button>
          </div>

          <select
            value={rmId}
            onChange={(e) => setRmId(e.target.value)}
            className="w-full rounded-md px-3.5 py-3 mb-3 text-body-m bg-base border border-line text-tx1 focus:border-line-strong focus:outline-none"
          >
            <option value="">Choose material…</option>
            {sortedMaterials.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.name} — {Math.round(stockMap[rm.id!] ?? 0)}{rm.unit} in hand
              </option>
            ))}
          </select>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder={sheet === 'audit' ? 'Counted qty' : 'Quantity'}
              className="flex-1 rounded-md px-3.5 py-3 text-body-m font-mono bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
            />
            {sheet === 'in' && (
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="Rate/unit (₹)"
                className="flex-1 rounded-md px-3.5 py-3 text-body-m font-mono bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
              />
            )}
          </div>

          {sheet === 'waste' && (
            <div className="flex flex-wrap gap-2 mb-3">
              {WASTAGE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="tap rounded-full px-3 py-1.5 text-body-s font-semibold border transition-colors"
                  style={{
                    backgroundColor: reason === r ? 'var(--color-danger)' : 'var(--color-base)',
                    borderColor: reason === r ? 'var(--color-danger)' : 'var(--color-line)',
                    color: reason === r ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!rmId || !qty || isSubmitting}
            className="tap w-full h-[48px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-marigold)',
              color: 'var(--color-tx-inverse)',
            }}
          >
            {isSubmitting ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      )}

      {/* Full raw material list */}
      <Label>Everything in the kitchen</Label>
      <div className="mt-1 divide-y divide-line">
        {sortedMaterials.map((rm) => {
          const have = stockMap[rm.id!] ?? 0;
          const low = have < rm.reorderLevel;
          return (
            <div key={rm.id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-body-m text-tx1">{rm.name}</div>
                <div className="text-body-s text-tx3">
                  {formatRupees(rm.avgCost * have)} at {formatUnitRate(rm.avgCost, rm.unit)}
                </div>
              </div>
              <div
                className="font-mono text-mono-m font-bold"
                style={{ color: low ? 'var(--color-danger)' : 'var(--color-tx1)' }}
              >
                {Math.round(have)}
                <span className="text-body-s text-tx3"> {rm.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
