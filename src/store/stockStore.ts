import { create } from 'zustand';
import { db } from '../db/schema';
import { nextId } from '../db/ids';
import { recordAudit as logAudit } from '../db/audit';
import { computeWeightedAvgCost } from '../lib/stockMoves';
import type { StockMove, Expense, RawMaterial } from '../db/types';

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
  addRawMaterial: (params: {
    name: string;
    unit: string;
    category: string;
    costPaise: number;
    reorderLevel: number;
  }) => Promise<number>;
  setRawMaterialArchived: (rmId: number, isArchived: boolean) => Promise<void>;
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

    await db.transaction(
      'rw',
      [db.stockMoves, db.rawMaterials, db.expenses, db.auditLog],
      async () => {
        await db.stockMoves.add({
          id: await nextId(db.stockMoves),
          dayId,
          rmId,
          type: 'in',
          qty,
          rate: effectiveRate,
          reason: 'Stock in',
          createdAt: now,
        } as StockMove);

        if (ratePaise !== undefined) {
          // Blend the new rate into what is already on the shelf rather than
          // replacing it, so one cheap sack does not reprice existing stock.
          const priorMoves = await db.stockMoves.where('rmId').equals(rmId).toArray();
          const qtyBefore =
            priorMoves.reduce((sum, m) => sum + m.qty, 0) - qty;

          await db.rawMaterials.update(rmId, {
            avgCost: computeWeightedAvgCost(qtyBefore, rm.avgCost, qty, ratePaise),
          });

          await db.expenses.add({
            id: await nextId(db.expenses),
            dayId,
            category: 'Raw material',
            amount: Math.round(qty * ratePaise),
            paymentMode: 'Cash',
            note: `${rm.name} ${qty}${rm.unit}`,
          } as Expense);
        }

        await logAudit({
          action: 'stock.in',
          detail: `${rm.name} +${qty}${rm.unit}${ratePaise !== undefined ? ` at ${ratePaise}p/${rm.unit}` : ''}`,
          dayId,
        });
      }
    );
  },

  recordWastage: async ({ dayId, rmId, qty, reason }) => {
    if (qty <= 0) throw new Error('Quantity must be greater than zero');

    await db.transaction('rw', [db.stockMoves, db.rawMaterials, db.auditLog], async () => {
      const rm = await db.rawMaterials.get(rmId);

      await db.stockMoves.add({
        id: await nextId(db.stockMoves),
        dayId,
        rmId,
        type: 'wastage',
        qty: -qty,
        reason,
        createdAt: new Date().toISOString(),
      } as StockMove);

      await logAudit({
        action: 'stock.wastage',
        detail: `${rm?.name ?? `#${rmId}`} −${qty}${rm?.unit ?? ''} · ${reason}`,
        dayId,
      });
    });
  },

  addRawMaterial: async ({ name, unit, category, costPaise, reorderLevel }) => {
    const trimmed = name.trim();
    if (trimmed === '') throw new Error('The material needs a name');
    if (costPaise < 0) throw new Error('Cost cannot be negative');

    let rmId = 0;
    await db.transaction('rw', [db.rawMaterials, db.auditLog], async () => {
      const clash = await db.rawMaterials
        .filter((r) => r.name.toLowerCase() === trimmed.toLowerCase() && !r.isArchived)
        .first();
      if (clash) throw new Error(`${trimmed} is already in the kitchen list`);

      rmId = await db.rawMaterials.add({
        id: await nextId(db.rawMaterials),
        name: trimmed,
        unit: unit.trim() || 'pc',
        category: category.trim() || 'Other',
        avgCost: costPaise,
        reorderLevel,
        isArchived: false,
      } as RawMaterial);

      await logAudit({
        action: 'stock.material.create',
        detail: `${trimmed} added at ${costPaise}p per ${unit}`,
      });
    });

    return rmId;
  },

  /**
   * Takes a material off the kitchen list without deleting it. Its stock moves
   * stay, so past sales and counts still add up.
   */
  setRawMaterialArchived: async (rmId, isArchived) => {
    await db.transaction('rw', [db.rawMaterials, db.auditLog], async () => {
      const before = await db.rawMaterials.get(rmId);
      if (!before) throw new Error('That material no longer exists');

      await db.rawMaterials.update(rmId, { isArchived });
      await logAudit({
        action: isArchived ? 'stock.material.remove' : 'stock.material.restore',
        detail: `${before.name} ${isArchived ? 'removed from' : 'restored to'} the kitchen list`,
      });
    });
  },

  // Physical count reconciliation: logs the delta between the counted quantity
  // and what the ledger currently says is on hand.
  recordAudit: async ({ dayId, rmId, countedQty, currentQty }) => {
    if (countedQty < 0) throw new Error('Counted quantity cannot be negative');

    const delta = countedQty - currentQty;
    if (delta === 0) return;

    await db.transaction('rw', [db.stockMoves, db.rawMaterials, db.auditLog], async () => {
      const rm = await db.rawMaterials.get(rmId);

      await db.stockMoves.add({
        id: await nextId(db.stockMoves),
        dayId,
        rmId,
        type: 'audit',
        qty: delta,
        reason: 'Physical count',
        createdAt: new Date().toISOString(),
      } as StockMove);

      await logAudit({
        action: 'stock.count',
        detail:
          `${rm?.name ?? `#${rmId}`} counted ${countedQty}${rm?.unit ?? ''}, ` +
          `ledger said ${currentQty} · ${delta > 0 ? '+' : ''}${delta}`,
        dayId,
      });
    });
  },
}));
