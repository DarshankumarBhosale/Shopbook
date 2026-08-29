import { create } from 'zustand';
import { db } from '../db/schema';
import { recordAudit } from '../db/audit';
import type { Item } from '../db/types';
import { assertOwner, type Role } from '../lib/permissions';
import { formatRupees } from '../lib/format';

interface ItemState {
  setCounterPrice: (itemId: number, pricePaise: number, role: Role | null) => Promise<void>;
  setOnlinePrice: (itemId: number, pricePaise: number, role: Role | null) => Promise<void>;
  setActive: (itemId: number, isActive: boolean, role: Role | null) => Promise<void>;
  swapSortOrder: (a: Item, b: Item, role: Role | null) => Promise<void>;
}

async function updatePrice(
  itemId: number,
  pricePaise: number,
  role: Role | null,
  field: 'sellPriceCounter' | 'sellPriceOnline',
  label: string
) {
  assertOwner(role, 'editMenu');
  if (pricePaise < 0) throw new Error('Price cannot be negative');

  await db.transaction('rw', [db.items, db.auditLog], async () => {
    const before = await db.items.get(itemId);
    if (!before) throw new Error('That item no longer exists');

    await db.items.update(itemId, { [field]: pricePaise });
    await recordAudit({
      action: 'item.price',
      detail: `${before.name} ${label} ${formatRupees(before[field])} → ${formatRupees(pricePaise)}`,
      role,
    });
  });
}

export const useItemStore = create<ItemState>(() => ({
  setCounterPrice: (itemId, pricePaise, role) =>
    updatePrice(itemId, pricePaise, role, 'sellPriceCounter', 'counter'),

  setOnlinePrice: (itemId, pricePaise, role) =>
    updatePrice(itemId, pricePaise, role, 'sellPriceOnline', 'online'),

  setActive: async (itemId, isActive, role) => {
    assertOwner(role, 'editMenu');

    await db.transaction('rw', [db.items, db.auditLog], async () => {
      const before = await db.items.get(itemId);
      if (!before) throw new Error('That item no longer exists');

      await db.items.update(itemId, { isActive });
      await recordAudit({
        action: 'item.availability',
        detail: `${before.name} turned ${isActive ? 'on' : 'off'}`,
        role,
      });
    });
  },

  // Swapping the two sortOrder values has to be atomic: a partial write would
  // leave two tiles claiming the same board position.
  swapSortOrder: async (a, b, role) => {
    assertOwner(role, 'editMenu');
    if (!a.id || !b.id) return;

    await db.transaction('rw', [db.items, db.auditLog], async () => {
      await db.items.update(a.id!, { sortOrder: b.sortOrder });
      await db.items.update(b.id!, { sortOrder: a.sortOrder });
      await recordAudit({
        action: 'item.reorder',
        detail: `${a.name} moved to position ${b.sortOrder}`,
        role,
      });
    });
  },
}));
