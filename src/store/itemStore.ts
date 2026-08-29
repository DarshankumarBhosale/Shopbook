import { create } from 'zustand';
import { db } from '../db/schema';
import type { Item } from '../db/types';

interface ItemState {
  setCounterPrice: (itemId: number, pricePaise: number) => Promise<void>;
  setOnlinePrice: (itemId: number, pricePaise: number) => Promise<void>;
  setActive: (itemId: number, isActive: boolean) => Promise<void>;
  swapSortOrder: (a: Item, b: Item) => Promise<void>;
}

export const useItemStore = create<ItemState>(() => ({
  setCounterPrice: async (itemId, pricePaise) => {
    if (pricePaise < 0) throw new Error('Price cannot be negative');
    await db.items.update(itemId, { sellPriceCounter: pricePaise });
  },

  setOnlinePrice: async (itemId, pricePaise) => {
    if (pricePaise < 0) throw new Error('Price cannot be negative');
    await db.items.update(itemId, { sellPriceOnline: pricePaise });
  },

  setActive: async (itemId, isActive) => {
    await db.items.update(itemId, { isActive });
  },

  // Swapping the two sortOrder values has to be atomic: a partial write would
  // leave two tiles claiming the same board position.
  swapSortOrder: async (a, b) => {
    if (!a.id || !b.id) return;
    await db.transaction('rw', db.items, async () => {
      await db.items.update(a.id!, { sortOrder: b.sortOrder });
      await db.items.update(b.id!, { sortOrder: a.sortOrder });
    });
  },
}));
