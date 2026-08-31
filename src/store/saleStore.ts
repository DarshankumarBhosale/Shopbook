import { create } from 'zustand';
import { db } from '../db/schema';
import { nextId, withIds } from '../db/ids';
import { recordAudit } from '../db/audit';
import { assertDayOpen } from '../db/dayGuard';
import type { PaymentMode, Sale, SaleLine, StockMove } from '../db/types';
import { computeStockMoves } from '../lib/stockMoves';
import { computeSaleCOGS } from '../lib/cogs';
import { assertOwner, type Role } from '../lib/permissions';
import { formatRupees } from '../lib/format';

interface SaleState {
  cart: Record<number, number>; // itemId -> qty
  addToCart: (itemId: number) => void;
  decrementFromCart: (itemId: number) => void;
  clearCart: () => void;
  commitSale: (params: {
    dayId: number;
    paymentMode: PaymentMode;
    createdBy?: string;
    /** Required for Udhaar — a khata entry has to belong to someone. */
    customerId?: number;
  }) => Promise<number>; // returns total gross paise
  reverseSale: (params: {
    saleId: number;
    reason: string;
    role: Role | null;
  }) => Promise<void>;
}

export const useSaleStore = create<SaleState>((set, get) => ({
  cart: {},

  addToCart: (itemId: number) => {
    set((state) => ({
      cart: {
        ...state.cart,
        [itemId]: (state.cart[itemId] || 0) + 1,
      },
    }));
  },

  decrementFromCart: (itemId: number) => {
    set((state) => {
      const currentQty = state.cart[itemId] || 0;
      if (currentQty <= 1) {
        const next = { ...state.cart };
        delete next[itemId];
        return { cart: next };
      }
      return {
        cart: {
          ...state.cart,
          [itemId]: currentQty - 1,
        },
      };
    });
  },

  clearCart: () => set({ cart: {} }),

  commitSale: async ({ dayId, paymentMode, createdBy, customerId }) => {
    const { cart } = get();
    const itemIds = Object.keys(cart).map(Number);
    if (itemIds.length === 0) throw new Error('Cart is empty');

    // An Udhaar sale with no customer is money owed by nobody — it would
    // never appear in any khata balance and would be silently lost.
    if (paymentMode === 'Udhaar' && customerId === undefined) {
      throw new Error('Udhaar needs a customer');
    }

    // Fetch master records needed for calculation
    const [items, recipes, rawMaterials] = await Promise.all([
      db.items.bulkGet(itemIds),
      db.recipes.toArray(),
      db.rawMaterials.toArray(),
    ]);

    const linesData: Array<{ itemId: number; qty: number; rate: number; amount: number }> = [];
    let grossPaise = 0;

    for (const itemId of itemIds) {
      const it = items.find((i) => i && i.id === itemId);
      if (!it) continue;
      const qty = cart[itemId];
      const rate = it.sellPriceCounter;
      const amount = rate * qty;
      grossPaise += amount;
      linesData.push({ itemId, qty, rate, amount });
    }

    const cogsPaise = computeSaleCOGS(linesData, recipes, rawMaterials);
    const now = new Date().toISOString();

    const saleRecord: Omit<Sale, 'id'> = {
      dayId,
      channel: 'counter',
      grossAmount: grossPaise,
      commissionAmt: 0,
      netAmount: grossPaise,
      cogs: cogsPaise,
      paymentMode,
      customerId,
      createdBy: createdBy || 'User',
      createdAt: now,
    };

    // Calculate stock deduction moves
    const stockMovesToInsert = computeStockMoves(linesData, recipes, dayId, now);

    // Commit atomically in Dexie
    await db.transaction(
      'rw',
      [db.sales, db.saleLines, db.stockMoves, db.dayBook, db.auditLog, db.meta],
      async () => {
        // Checked in here, not before, so the day cannot close underneath us
        // between the check and the write.
        await assertDayOpen(dayId);

        const saleId = await db.sales.add({ ...saleRecord, id: await nextId(db.sales) } as Sale);

        const saleLinesRecords: SaleLine[] = linesData.map((l) => ({
          saleId,
          itemId: l.itemId,
          qty: l.qty,
          rate: l.rate,
          amount: l.amount,
        }));

        await db.saleLines.bulkAdd(await withIds(db.saleLines, saleLinesRecords));
        await db.stockMoves.bulkAdd(await withIds(db.stockMoves, stockMovesToInsert as StockMove[]));

        await recordAudit({
          action: 'sale.create',
          detail: `Sale #${saleId} · ${formatRupees(grossPaise)} · ${paymentMode}`,
          role: (createdBy as Role) ?? null,
          dayId,
        });
      }
    );

    set({ cart: {} });
    return grossPaise;
  },

  /**
   * Cancels a sale by appending its opposite rather than deleting it, so the
   * mistake and the correction both stay on the record. Stock is put back with
   * `reversal` moves.
   */
  reverseSale: async ({ saleId, reason, role }) => {
    assertOwner(role, 'reverseSale');

    const trimmedReason = reason.trim();
    if (trimmedReason === '') throw new Error('A reversal needs a reason');

    await db.transaction(
      'rw',
      [db.sales, db.saleLines, db.stockMoves, db.dayBook, db.auditLog, db.meta],
      async () => {
        const original = await db.sales.get(saleId);
        if (!original) throw new Error('That sale no longer exists');
        if (original.reversesSaleId !== undefined) {
          throw new Error('A reversal cannot itself be reversed');
        }

        const already = await db.sales
          .filter((s) => s.reversesSaleId === saleId)
          .first();
        if (already) throw new Error('That sale is already reversed');

        // A closed day is immutable (rule 4) — reopen it first.
        await assertDayOpen(original.dayId);

        const now = new Date().toISOString();

        const reversal: Omit<Sale, 'id'> = {
          dayId: original.dayId,
          channel: original.channel,
          grossAmount: -original.grossAmount,
          commissionAmt: -original.commissionAmt,
          netAmount: -original.netAmount,
          cogs: -original.cogs,
          paymentMode: original.paymentMode,
          customerId: original.customerId,
          createdBy: role ?? 'owner',
          createdAt: now,
          reversesSaleId: saleId,
          reversalReason: trimmedReason,
        };

        const reversalId = await db.sales.add({ ...reversal, id: await nextId(db.sales) } as Sale);

        const originalLines = await db.saleLines
          .where('saleId')
          .equals(saleId)
          .toArray();

        await db.saleLines.bulkAdd(
          await withIds(
            db.saleLines,
            originalLines.map((l) => ({
              saleId: reversalId,
              itemId: l.itemId,
              qty: -l.qty,
              rate: l.rate,
              amount: -l.amount,
            }))
          )
        );

        // Put the ingredients back on the shelf.
        const originalMoves = await db.stockMoves
          .where('dayId')
          .equals(original.dayId)
          .filter((m) => m.type === 'sale' && m.createdAt === original.createdAt)
          .toArray();

        if (originalMoves.length > 0) {
          await db.stockMoves.bulkAdd(
            await withIds(
              db.stockMoves,
              originalMoves.map((m) => ({
                dayId: m.dayId,
                rmId: m.rmId,
                type: 'reversal' as const,
                qty: -m.qty,
                reason: `Reversal of sale #${saleId}`,
                createdAt: now,
              })) as StockMove[]
            )
          );
        }

        await recordAudit({
          action: 'sale.reverse',
          detail: `Sale #${saleId} (${formatRupees(original.grossAmount)}) reversed · ${trimmedReason}`,
          role,
          dayId: original.dayId,
        });
      }
    );
  },
}));
