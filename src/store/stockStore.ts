import { create } from 'zustand';
import { db } from '../db/schema';
import type { StockMove, Expense } from '../db/types';

export const WASTAGE_REASONS = ['Spoiled', 'Spilled', 'Unsold at close', 'Staff meal'] as const;

interface StockState {
  recordStockIn: (params: {
    dayId: number;
    rmId: number;
    qty: number;
    ratePaise?: number;
  }) => Promise<void>;
  recordWastage: (params: {
    dayId: number;
    rmId: number;
    qty: number;
    reason: string;
  }) => Promise<void>;
  recordAudit: (params: {
    dayId: number;
    rmId: number;
    countedQty: number;
    currentQty: number;
  }) => Promise<void>;
}

export const useStockStore = create<StockState>(() => ({
  // Records a purchase of raw material. If a rate is given, it also becomes the
  // material's new weighted-average cost and is logged as a "Raw material" expense
  // (mirrors the reference implementation: rate-less stock-in is treated as a
  // free/already-paid-for adjustment, not a fresh expense).
  recordStockIn: async ({ dayId, rmId, qty, ratePaise }) => {
    if (qty <= 0) throw new Error('Quantity must be greater than zero');

    const rm = await db.rawMaterials.get(rmId);
    if (!rm) throw new Error('Raw material not found');

    const effectiveRate = ratePaise !== undefined ? ratePaise : rm.avgCost;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.stockMoves, db.rawMaterials, db.expenses], async () => {
      await db.stockMoves.add({
        dayId,
        rmId,
        type: 'in',
        qty,
        rate: effectiveRate,
        reason: 'Stock in',
        createdAt: now,
      } as StockMove);

      if (ratePaise !== undefined) {
        await db.rawMaterials.update(rmId, { avgCost: ratePaise });
        await db.expenses.add({
          dayId,
          category: 'Raw material',
          amount: Math.round(qty * ratePaise),
          paymentMode: 'Cash',
          note: `${rm.name} ${qty}${rm.unit}`,
        } as Expense);
      }
    });
  },

  recordWastage: async ({ dayId, rmId, qty, reason }) => {
    if (qty <= 0) throw new Error('Quantity must be greater than zero');

    await db.stockMoves.add({
      dayId,
      rmId,
      type: 'wastage',
      qty: -qty,
      reason,
      createdAt: new Date().toISOString(),
    } as StockMove);
  },

  // Physical count reconciliation: logs the delta between the counted quantity
  // and what the ledger currently says is on hand.
  recordAudit: async ({ dayId, rmId, countedQty, currentQty }) => {
    if (countedQty < 0) throw new Error('Counted quantity cannot be negative');

    const delta = countedQty - currentQty;
    if (delta === 0) return;

    await db.stockMoves.add({
      dayId,
      rmId,
      type: 'audit',
      qty: delta,
      reason: 'Physical count',
      createdAt: new Date().toISOString(),
    } as StockMove);
  },
}));
