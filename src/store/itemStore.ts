import { create } from 'zustand';
import { db } from '../db/schema';
import { recordAudit } from '../db/audit';
import type { Item, RawMaterial, Recipe } from '../db/types';
import { assertOwner, type Role } from '../lib/permissions';
import { formatRupees } from '../lib/format';

interface ItemState {
  setCounterPrice: (itemId: number, pricePaise: number, role: Role | null) => Promise<void>;
  setOnlinePrice: (itemId: number, pricePaise: number, role: Role | null) => Promise<void>;
  setActive: (itemId: number, isActive: boolean, role: Role | null) => Promise<void>;
  swapSortOrder: (a: Item, b: Item, role: Role | null) => Promise<void>;
  addItem: (params: {
    name: string;
    category: string;
    counterPaise: number;
    onlinePaise: number;
    /**
     * For a resale good: what one unit costs you. Creates a matching raw
     * material and a 1:1 recipe, so it deducts stock and carries a real cost
     * like every other item. Omit for something cooked — its recipe has to be
     * set up separately.
     */
    costPaise?: number;
    role: Role | null;
  }) => Promise<number>;
  setArchived: (itemId: number, isArchived: boolean, role: Role | null) => Promise<void>;
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

  addItem: async ({ name, category, counterPaise, onlinePaise, costPaise, role }) => {
    assertOwner(role, 'editMenu');

    const trimmed = name.trim();
    if (trimmed === '') throw new Error('The item needs a name');
    if (counterPaise < 0 || onlinePaise < 0) throw new Error('Price cannot be negative');

    let newItemId = 0;

    await db.transaction(
      'rw',
      [db.items, db.rawMaterials, db.recipes, db.auditLog],
      async () => {
        const clash = await db.items
          .filter((i) => i.name.toLowerCase() === trimmed.toLowerCase() && !i.isArchived)
          .first();
        if (clash) throw new Error(`${trimmed} is already on the menu`);

        // New tiles go to the end of the board rather than displacing anything.
        const all = await db.items.toArray();
        const nextSort = all.reduce((max, i) => Math.max(max, i.sortOrder ?? 0), 0) + 1;

        newItemId = await db.items.add({
          name: trimmed,
          category: category.trim() || 'Other',
          sellPriceCounter: counterPaise,
          sellPriceOnline: onlinePaise,
          sortOrder: nextSort,
          isActive: true,
          isArchived: false,
        } as Item);

        if (costPaise !== undefined) {
          const rmId = await db.rawMaterials.add({
            name: trimmed,
            unit: 'pc',
            category: 'Resale',
            avgCost: costPaise,
            reorderLevel: 10,
            isArchived: false,
          } as RawMaterial);

          await db.recipes.add({
            itemId: newItemId,
            rawMaterialId: rmId,
            qtyPerUnit: 1,
          } as Recipe);
        }

        await recordAudit({
          action: 'item.create',
          detail:
            `${trimmed} added at ${formatRupees(counterPaise)}` +
            (costPaise !== undefined ? ` · cost ${formatRupees(costPaise)}` : ' · no recipe yet'),
          role,
        });
      }
    );

    return newItemId;
  },

  /**
   * Removes an item from the shop without erasing it. Rule 3 — the row stays,
   * so every past sale still resolves to a real name and price, and the item
   * can be brought back.
   */
  setArchived: async (itemId, isArchived, role) => {
    assertOwner(role, 'editMenu');

    await db.transaction('rw', [db.items, db.auditLog], async () => {
      const before = await db.items.get(itemId);
      if (!before) throw new Error('That item no longer exists');

      await db.items.update(itemId, { isArchived, isActive: isArchived ? false : true });
      await recordAudit({
        action: isArchived ? 'item.remove' : 'item.restore',
        detail: `${before.name} ${isArchived ? 'removed from' : 'restored to'} the menu`,
        role,
      });
    });
  },
}));
