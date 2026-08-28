import { create } from 'zustand';
import { db } from '../db/schema';
import type { DayBook } from '../db/types';
import { toPaise } from '../lib/format';
import { computeVariance } from '../lib/cashRecon';

interface DayState {
  openDay: DayBook | null;
  isLoading: boolean;
  loadOpenDay: () => Promise<void>;
  openNewDay: (openingCashRupees: number | string) => Promise<DayBook>;
  closeCurrentDay: (
    countedRupees: number | string,
    expectedPaise: number,
    note: string,
    snapshot: { grossSalesPaise: number; cogsPaise: number; expensesPaise: number }
  ) => Promise<void>;
}

export const useDayStore = create<DayState>((set, get) => ({
  openDay: null,
  isLoading: true,

  loadOpenDay: async () => {
    try {
      set({ isLoading: true });
      const open = await db.dayBook.filter((d) => d.status === 'open').first();
      set({ openDay: open || null, isLoading: false });
    } catch (err) {
      console.error('Failed to load open day:', err);
      set({ openDay: null, isLoading: false });
    }
  },

  openNewDay: async (openingCashRupees: number | string) => {
    const openingCashPaise = toPaise(openingCashRupees);
    const newDay: Omit<DayBook, 'id'> = {
      date: new Date().toISOString(),
      openingCash: openingCashPaise,
      closingCashExpected: 0,
      closingCashCounted: 0,
      variance: 0,
      note: '',
      status: 'open',
    };

    const id = await db.dayBook.add(newDay as DayBook);
    const created = await db.dayBook.get(id);
    if (!created) throw new Error('Failed to retrieve created day book');

    set({ openDay: created });
    return created;
  },

  closeCurrentDay: async (
    countedRupees: number | string,
    expectedPaise: number,
    note: string,
    snapshot: { grossSalesPaise: number; cogsPaise: number; expensesPaise: number }
  ) => {
    const current = get().openDay;
    if (!current || !current.id) throw new Error('No open day to close');

    const countedPaise = toPaise(countedRupees);
    const variancePaise = computeVariance(expectedPaise, countedPaise);
    const closedAt = new Date().toISOString();

    const updatePayload: Partial<DayBook> = {
      status: 'closed',
      closingCashExpected: expectedPaise,
      closingCashCounted: countedPaise,
      variance: variancePaise,
      note: note.trim(),
      closedAt,
      grossSales: snapshot.grossSalesPaise,
      totalCogs: snapshot.cogsPaise,
      totalExpenses: snapshot.expensesPaise,
    };

    await db.dayBook.update(current.id, updatePayload);
    set({ openDay: null });
  },
}));
