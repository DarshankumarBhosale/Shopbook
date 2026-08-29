import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useItemStore } from '../../store/itemStore';
import { useStockStore } from '../../store/stockStore';
import { PermissionError } from '../permissions';

const CHIPS = 28; // resale item seeded from the shop's packaged goods

describe('removing an item keeps its history', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });
  });

  it('a sale of a removed item still resolves to its name and amount', async () => {
    const day = await useDayStore.getState().openNewDay(500);
    useSaleStore.getState().addToCart(CHIPS);
    await useSaleStore.getState().commitSale({
      dayId: day.id!,
      paymentMode: 'Cash',
      createdBy: 'owner',
    });

    await useItemStore.getState().setArchived(CHIPS, true, 'owner');

    // The row survives, so the sale line still names a real item.
    const item = await db.items.get(CHIPS);
    expect(item).toBeDefined();
    expect(item!.name).toBe('Chips packet');
    expect(item!.isArchived).toBe(true);

    const lines = await db.saleLines.toArray();
    expect(lines).toHaveLength(1);
    expect(lines[0].itemId).toBe(CHIPS);
    expect(lines[0].amount).toBe(500);
  });

  it('a removed item is off the Sell board but stays in the master', async () => {
    await useItemStore.getState().setArchived(CHIPS, true, 'owner');

    const sellable = await db.items
      .filter((i) => i.isActive && !i.isArchived)
      .toArray();
    expect(sellable.some((i) => i.id === CHIPS)).toBe(false);

    const everything = await db.items.toArray();
    expect(everything.some((i) => i.id === CHIPS)).toBe(true);
  });

  it('can be put back', async () => {
    await useItemStore.getState().setArchived(CHIPS, true, 'owner');
    await useItemStore.getState().setArchived(CHIPS, false, 'owner');

    const item = await db.items.get(CHIPS);
    expect(item!.isArchived).toBe(false);
    expect(item!.isActive).toBe(true);
  });

  it('refuses a helper', async () => {
    await expect(
      useItemStore.getState().setArchived(CHIPS, true, 'helper')
    ).rejects.toThrow(PermissionError);
  });
});

describe('adding an item', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
  });

  it('creates a matching material and 1:1 recipe when a cost is given', async () => {
    const id = await useItemStore.getState().addItem({
      name: 'Good Day',
      category: 'Packaged',
      counterPaise: 1000,
      onlinePaise: 1500,
      costPaise: 910,
      role: 'owner',
    });

    const item = await db.items.get(id);
    expect(item!.name).toBe('Good Day');
    expect(item!.sellPriceCounter).toBe(1000);

    const recipes = await db.recipes.filter((r) => r.itemId === id).toArray();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].qtyPerUnit).toBe(1);

    const rm = await db.rawMaterials.get(recipes[0].rawMaterialId);
    expect(rm!.name).toBe('Good Day');
    expect(rm!.avgCost).toBe(910);
    expect(rm!.unit).toBe('pc');
  });

  it('creates no recipe when no cost is given', async () => {
    const id = await useItemStore.getState().addItem({
      name: 'Special Thali',
      category: 'Main Course',
      counterPaise: 12000,
      onlinePaise: 16000,
      role: 'owner',
    });

    const recipes = await db.recipes.filter((r) => r.itemId === id).toArray();
    expect(recipes).toHaveLength(0);
  });

  it('refuses a duplicate name and a helper', async () => {
    await expect(
      useItemStore.getState().addItem({
        name: 'vada pav',
        category: 'Breakfast',
        counterPaise: 1500,
        onlinePaise: 2000,
        role: 'owner',
      })
    ).rejects.toThrow(/already on the menu/);

    await expect(
      useItemStore.getState().addItem({
        name: 'Anything',
        category: 'Packaged',
        counterPaise: 100,
        onlinePaise: 200,
        role: 'helper',
      })
    ).rejects.toThrow(PermissionError);
  });
});

describe('removing a raw material keeps its ledger', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
  });

  it('keeps the stock moves after removal', async () => {
    const before = await db.stockMoves.where('rmId').equals(1).count();
    expect(before).toBeGreaterThan(0);

    await useStockStore.getState().setRawMaterialArchived(1, true);

    const after = await db.stockMoves.where('rmId').equals(1).count();
    expect(after).toBe(before);

    const rm = await db.rawMaterials.get(1);
    expect(rm!.isArchived).toBe(true);
  });

  it('adds a new material with its own stock line', async () => {
    const id = await useStockStore.getState().addRawMaterial({
      name: 'Good Day',
      unit: 'pc',
      category: 'Resale',
      costPaise: 910,
      reorderLevel: 10,
    });

    const rm = await db.rawMaterials.get(id);
    expect(rm!.name).toBe('Good Day');
    expect(rm!.avgCost).toBe(910);
  });
});
