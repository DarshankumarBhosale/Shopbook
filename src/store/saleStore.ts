import { create } from 'zustand';
import { db } from '../db/schema';
import type { PaymentMode, Sale, SaleLine, StockMove } from '../db/types';
import { computeStockMoves } from '../lib/stockMoves';
import { computeSaleCOGS } from '../lib/cogs';

interface SaleState {
  cart: Record<number, number>; // itemId -> qty
  addToCart: (itemId: number) => void;
  decrementFromCart: (itemId: number) => void;
  clearCart: () => void;
  commitSale: (params: {
    dayId: number;
    paymentMode: PaymentMode;
    createdBy?: string;
  }) => Promise<number>; // returns total gross paise
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

  commitSale: async ({ dayId, paymentMode, createdBy }) => {
    const { cart } = get();
    const itemIds = Object.keys(cart).map(Number);
    if (itemIds.length === 0) throw new Error('Cart is empty');

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
      createdBy: createdBy || 'User',
      createdAt: now,
    };

    // Calculate stock deduction moves
    const stockMovesToInsert = computeStockMoves(linesData, recipes, dayId, now);

    // Commit atomically in Dexie
    await db.transaction('rw', [db.sales, db.saleLines, db.stockMoves], async () => {
      const saleId = await db.sales.add(saleRecord as Sale);

      const saleLinesRecords: SaleLine[] = linesData.map((l) => ({
        saleId,
        itemId: l.itemId,
        qty: l.qty,
        rate: l.rate,
        amount: l.amount,
      }));

      await db.saleLines.bulkAdd(saleLinesRecords);
      await db.stockMoves.bulkAdd(stockMovesToInsert as StockMove[]);
    });

    set({ cart: {} });
    return grossPaise;
  },
}));
