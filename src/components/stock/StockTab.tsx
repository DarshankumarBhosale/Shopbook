import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';
import { useStockStore, WASTAGE_REASONS } from '../../store/stockStore';
import { computeAllStock, computeLowStock } from '../../lib/stockMoves';
import { Label } from '../common/Label';
import { formatRupees, formatUnitRate } from '../../lib/format';

type Sheet = 'in' | 'waste' | 'audit' | 'new' | null;

export const StockTab: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);
  const showToast = useUIStore((state) => state.showToast);
  const { recordStockIn, recordWastage, recordAudit, addRawMaterial, setRawMaterialArchived } =
    useStockStore();

  const allMaterials = useLiveQuery(() => db.rawMaterials.toArray(), []) || [];
  const rawMaterials = React.useMemo(
    () => allMaterials.filter((r) => !r.isArchived),
    [allMaterials]
  );
  const removedMaterials = React.useMemo(
    () => allMaterials.filter((r) => r.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [allMaterials]
  );
  const stockMoves = useLiveQuery(() => db.stockMoves.toArray(), []) || [];

  const [newRm, setNewRm] = useState({ name: '', unit: 'pc', category: 'Resale', cost: '', reorder: '' });

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

  // Grouped by where the material is actually bought, so the list reads like
  // a shopping round rather than one long alphabet.
  const byCategory = React.useMemo(() => {
    const groups = new Map<string, typeof sortedMaterials>();
    for (const rm of sortedMaterials) {
      const key = rm.category || 'Other';
      const bucket = groups.get(key);
      if (bucket) bucket.push(rm);
      else groups.set(key, [rm]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedMaterials]);

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

  const handleAddMaterial = async () => {
    const cost = Math.round(Number(newRm.cost || 0) * 100);
    if (newRm.name.trim() === '' || !Number.isFinite(cost) || cost < 0) return;

    try {
      setIsSubmitting(true);
      await addRawMaterial({
        name: newRm.name,
        unit: newRm.unit,
        category: newRm.category,
        costPaise: cost,
        reorderLevel: Number(newRm.reorder || 0),
      });
      showToast(`${newRm.name.trim()} added to the kitchen`);
      setNewRm({ name: '', unit: 'pc', category: 'Resale', cost: '', reorder: '' });
      setSheet(null);
    } catch (err) {
      console.error('Failed to add material:', err);
      showToast(err instanceof Error ? err.message : 'Could not add that material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveMaterial = async (id: number, archived: boolean, name: string) => {
    try {
      await setRawMaterialArchived(id, archived);
      showToast(archived ? `${name} removed` : `${name} put back`);
    } catch (err) {
      console.error('Failed to change material:', err);
      showToast('Could not change that material');
    }
  };

  const sheetTitle =
    sheet === 'in'
      ? 'Stock in'
      : sheet === 'waste'
        ? 'Log wastage'
        : sheet === 'new'
          ? 'New material'
          : 'Physical count';

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {(
          [
            ['in', 'Stock in'],
            ['waste', 'Wastage'],
            ['audit', 'Count'],
            ['new', '+ New'],
          ] as [Sheet, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => openSheet(id)}
            className="tap flex-1 py-2.5 rounded-md text-[13px] font-bold border transition-colors"
            style={{
              backgroundColor: sheet === id ? 'var(--color-primary)' : 'var(--color-surface)',
              borderColor: sheet === id ? 'var(--color-primary)' : 'var(--color-line)',
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

          {sheet === 'new' ? (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newRm.name}
                onChange={(e) => setNewRm({ ...newRm, name: e.target.value })}
                placeholder="Name, e.g. Good Day biscuit"
                aria-label="New material name"
                className="min-h-[44px] rounded-md px-3.5 text-body-m bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>Unit</span>
                  <select
                    value={newRm.unit}
                    onChange={(e) => setNewRm({ ...newRm, unit: e.target.value })}
                    aria-label="New material unit"
                    className="min-h-[44px] rounded-md px-2 text-body-m bg-base border border-line text-tx1 focus:outline-none"
                  >
                    <option value="pc">pc</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>Cost ₹/unit</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newRm.cost}
                    onChange={(e) => setNewRm({ ...newRm, cost: e.target.value.replace(/[^\d.]/g, '') })}
                    aria-label="New material cost"
                    className="min-h-[44px] rounded-md px-2 font-mono text-body-m bg-base border border-line text-tx1 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>Reorder at</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newRm.reorder}
                    onChange={(e) => setNewRm({ ...newRm, reorder: e.target.value.replace(/\D/g, '') })}
                    aria-label="New material reorder level"
                    className="min-h-[44px] rounded-md px-2 font-mono text-body-m bg-base border border-line text-tx1 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {['Resale', 'Bakery', 'Dairy', 'Grocery', 'Vegetables', 'Packaged'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewRm({ ...newRm, category: c })}
                    className="tap min-h-[44px] rounded-full px-3 text-body-s font-semibold border"
                    style={{
                      backgroundColor: newRm.category === c ? 'var(--color-primary)' : 'var(--color-base)',
                      borderColor: newRm.category === c ? 'var(--color-primary)' : 'var(--color-line)',
                      color: newRm.category === c ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddMaterial}
                disabled={newRm.name.trim() === '' || newRm.cost === '' || isSubmitting}
                className="tap min-h-[48px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-tx-on-accent)',
                }}
              >
                {isSubmitting ? 'Saving…' : 'Add material'}
              </button>
            </div>
          ) : (
          <>
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
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-tx-on-accent)',
            }}
          >
            {isSubmitting ? 'SAVING...' : 'SAVE'}
          </button>
          </>
          )}
        </div>
      )}

      {/* Full raw material list, grouped by where it is bought */}
      <Label>Everything in the kitchen</Label>
      <div className="mt-1 flex flex-col gap-4">
        {byCategory.map(([category, materials]) => (
          <div key={category}>
            <div className="flex items-baseline justify-between border-b border-line pb-1 mb-1">
              <span className="font-display text-[14px] tracking-[0.06em] uppercase text-tx2">
                {category}
              </span>
              <span className="font-mono text-body-s text-tx3">
                {materials.length}
              </span>
            </div>

            <div className="divide-y divide-line">
              {materials.map((rm) => {
                const have = stockMap[rm.id!] ?? 0;
                const low = have < rm.reorderLevel;
                return (
                  <div key={rm.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-body-m text-tx1">{rm.name}</div>
                      <div className="text-body-s text-tx3">
                        {formatRupees(rm.avgCost * have)} at{' '}
                        {formatUnitRate(rm.avgCost, rm.unit)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className="font-mono text-mono-m font-bold"
                        style={{ color: low ? 'var(--color-danger-text)' : 'var(--color-tx1)' }}
                      >
                        {Math.round(have)}
                        <span className="text-body-s text-tx3"> {rm.unit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleArchiveMaterial(rm.id!, true, rm.name)}
                        aria-label={`Remove ${rm.name}`}
                        className="tap w-11 h-11 rounded-sm border border-line bg-base text-tx3 text-[18px] leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Removed materials — their stock ledger is kept */}
      {removedMaterials.length > 0 && (
        <div className="mt-6">
          <Label>Removed</Label>
          <p className="text-body-s text-tx2 mt-1 mb-2">
            Off the kitchen list. Their stock history is kept, so old counts and
            sales still add up.
          </p>
          <div className="flex flex-col gap-2">
            {removedMaterials.map((rm) => (
              <div
                key={rm.id}
                className="bg-surface border border-line rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-body-m text-tx2 truncate">{rm.name}</div>
                  <div className="text-body-s text-tx3">
                    {rm.category} · {formatUnitRate(rm.avgCost, rm.unit)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleArchiveMaterial(rm.id!, false, rm.name)}
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
  );
};
