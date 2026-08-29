import { db } from './schema';
import type { RawMaterial, Item, Recipe, StockMove, User, Shop, Customer } from './types';

/**
 * Raw material master for Aaisaheb Snacks Center.
 * `avgCost` is per base unit in paise and is a starting estimate only — it is
 * overwritten by the real rate the first time each material is bought in
 * through Stock In.
 */
export const SEED_RAW_MATERIALS: RawMaterial[] = [
  { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
  { id: 2, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
  { id: 3, name: 'Besan', unit: 'g', avgCost: 9, reorderLevel: 3000 },
  { id: 4, name: 'Oil', unit: 'ml', avgCost: 14, reorderLevel: 4000 },
  { id: 5, name: 'Onion', unit: 'g', avgCost: 4, reorderLevel: 6000 },
  { id: 6, name: 'Chutney', unit: 'g', avgCost: 12, reorderLevel: 1500 },
  { id: 7, name: 'Matki', unit: 'g', avgCost: 11, reorderLevel: 3000 },
  { id: 8, name: 'Farsan', unit: 'g', avgCost: 18, reorderLevel: 2000 },
  { id: 9, name: 'Maida', unit: 'g', avgCost: 5, reorderLevel: 3000 },
  { id: 10, name: 'Poha', unit: 'g', avgCost: 6, reorderLevel: 3000 },
  { id: 11, name: 'Rava', unit: 'g', avgCost: 5, reorderLevel: 3000 },
  { id: 12, name: 'Rice', unit: 'g', avgCost: 6, reorderLevel: 10000 },
  { id: 13, name: 'Wheat flour', unit: 'g', avgCost: 5, reorderLevel: 10000 },
  { id: 14, name: 'Jowar flour', unit: 'g', avgCost: 6, reorderLevel: 5000 },
  { id: 15, name: 'Egg', unit: 'pc', avgCost: 700, reorderLevel: 60 },
  { id: 16, name: 'Chicken', unit: 'g', avgCost: 28, reorderLevel: 3000 },
  { id: 17, name: 'Paneer', unit: 'g', avgCost: 40, reorderLevel: 1000 },
  { id: 18, name: 'Maggi noodles', unit: 'pc', avgCost: 1200, reorderLevel: 30 },
  { id: 19, name: 'Bread slice', unit: 'pc', avgCost: 150, reorderLevel: 100 },
  { id: 20, name: 'Milk', unit: 'ml', avgCost: 6, reorderLevel: 8000 },
  { id: 21, name: 'Sugar', unit: 'g', avgCost: 5, reorderLevel: 3000 },
  { id: 22, name: 'Tea powder', unit: 'g', avgCost: 45, reorderLevel: 500 },
  { id: 23, name: 'Coffee powder', unit: 'g', avgCost: 90, reorderLevel: 300 },
  { id: 24, name: 'Ghee', unit: 'g', avgCost: 60, reorderLevel: 800 },
  { id: 25, name: 'Curd', unit: 'g', avgCost: 8, reorderLevel: 3000 },
  { id: 26, name: 'Soda bottle', unit: 'pc', avgCost: 1400, reorderLevel: 24 },
  { id: 27, name: 'Toor dal', unit: 'g', avgCost: 14, reorderLevel: 3000 },
  { id: 28, name: 'Mixed vegetables', unit: 'g', avgCost: 5, reorderLevel: 4000 },
  { id: 29, name: 'Tomato', unit: 'g', avgCost: 4, reorderLevel: 3000 },
  { id: 30, name: 'Spice mix', unit: 'g', avgCost: 35, reorderLevel: 1000 },
  { id: 31, name: 'Coriander', unit: 'g', avgCost: 10, reorderLevel: 500 },
  { id: 32, name: 'Paper plate', unit: 'pc', avgCost: 120, reorderLevel: 200 },
];

/**
 * Menu for Aaisaheb Snacks Center, Talegaon Dabhade.
 * Counter prices are the shop's own. Online prices are counter + ~30 %,
 * rounded up to the nearest ₹5, to absorb aggregator commission.
 *
 * Misal Pav and Sheera are on the printed menu but are seeded inactive:
 * Misal Pav is currently not available, and Sheera has no price set yet.
 * Inactive items stay off the Sell grid but remain in the item master.
 */
export const SEED_ITEMS: Item[] = [
  // ── Breakfast ──
  { id: 1, name: 'Plain Upma', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 1, isActive: true },
  { id: 2, name: 'Poha', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 2, isActive: true },
  { id: 3, name: 'Aloo Paratha', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 3, isActive: true },
  { id: 4, name: 'Paneer Paratha', category: 'Breakfast', sellPriceCounter: 5000, sellPriceOnline: 6500, sortOrder: 4, isActive: true },
  { id: 5, name: 'Gol Bhaji', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 5, isActive: true },
  { id: 6, name: 'Kanda Bhaji', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 6, isActive: true },
  { id: 7, name: 'Misal Pav', category: 'Breakfast', sellPriceCounter: 0, sellPriceOnline: 0, sortOrder: 7, isActive: false },
  { id: 8, name: 'Sheera', category: 'Breakfast', sellPriceCounter: 0, sellPriceOnline: 0, sortOrder: 8, isActive: false },
  { id: 9, name: 'Plain Maggie', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 9, isActive: true },
  { id: 10, name: 'Bread Patice', category: 'Breakfast', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 10, isActive: true },
  { id: 11, name: 'Vada Pav', category: 'Breakfast', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 11, isActive: true },
  { id: 12, name: 'Boil Egg', category: 'Breakfast', sellPriceCounter: 1300, sellPriceOnline: 2000, sortOrder: 12, isActive: true },
  { id: 13, name: 'Egg Paratha', category: 'Breakfast', sellPriceCounter: 3000, sellPriceOnline: 4000, sortOrder: 13, isActive: true },
  { id: 14, name: 'Omelette Pav', category: 'Breakfast', sellPriceCounter: 3500, sellPriceOnline: 5000, sortOrder: 14, isActive: true },

  // ── Main course ──
  { id: 15, name: 'Rice Plate', category: 'Main Course', sellPriceCounter: 9000, sellPriceOnline: 12000, sortOrder: 15, isActive: true },
  { id: 16, name: 'Poori Bhaji Thali', category: 'Main Course', sellPriceCounter: 13000, sellPriceOnline: 17000, sortOrder: 16, isActive: true },
  { id: 17, name: 'Poori Bhaji', category: 'Main Course', sellPriceCounter: 6000, sellPriceOnline: 8000, sortOrder: 17, isActive: true },
  { id: 18, name: 'Egg Masala', category: 'Main Course', sellPriceCounter: 6000, sellPriceOnline: 8000, sortOrder: 18, isActive: true },
  { id: 19, name: 'Chicken Thali', category: 'Main Course', sellPriceCounter: 16000, sellPriceOnline: 21000, sortOrder: 19, isActive: true },
  { id: 20, name: 'Chicken Masala', category: 'Main Course', sellPriceCounter: 35000, sellPriceOnline: 45500, sortOrder: 20, isActive: true },
  { id: 21, name: 'Chapati', category: 'Main Course', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 21, isActive: true },
  { id: 22, name: 'Bhakri', category: 'Main Course', sellPriceCounter: 2000, sellPriceOnline: 3000, sortOrder: 22, isActive: true },

  // ── Beverage ──
  { id: 23, name: 'Tea', category: 'Beverage', sellPriceCounter: 1000, sellPriceOnline: 1500, sortOrder: 23, isActive: true },
  { id: 24, name: 'Coffee', category: 'Beverage', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 24, isActive: true },
  { id: 25, name: 'Lassi', category: 'Beverage', sellPriceCounter: 3000, sellPriceOnline: 4000, sortOrder: 25, isActive: true },
  { id: 26, name: 'Masala Taak', category: 'Beverage', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 26, isActive: true },
  { id: 27, name: 'Soda', category: 'Beverage', sellPriceCounter: 2000, sellPriceOnline: 3000, sortOrder: 27, isActive: true },
];

/**
 * Recipe (bill of materials) per one unit of each item.
 * These quantities drive automatic stock deduction and COGS, so they are the
 * numbers to correct first if a profit figure looks wrong.
 */
export const SEED_RECIPES: Omit<Recipe, 'id'>[] = [
  // Plain Upma
  { itemId: 1, rawMaterialId: 11, qtyPerUnit: 90 },
  { itemId: 1, rawMaterialId: 4, qtyPerUnit: 12 },
  { itemId: 1, rawMaterialId: 5, qtyPerUnit: 20 },
  { itemId: 1, rawMaterialId: 30, qtyPerUnit: 3 },

  // Poha
  { itemId: 2, rawMaterialId: 10, qtyPerUnit: 90 },
  { itemId: 2, rawMaterialId: 5, qtyPerUnit: 25 },
  { itemId: 2, rawMaterialId: 4, qtyPerUnit: 12 },
  { itemId: 2, rawMaterialId: 30, qtyPerUnit: 3 },
  { itemId: 2, rawMaterialId: 31, qtyPerUnit: 3 },

  // Aloo Paratha
  { itemId: 3, rawMaterialId: 13, qtyPerUnit: 80 },
  { itemId: 3, rawMaterialId: 2, qtyPerUnit: 80 },
  { itemId: 3, rawMaterialId: 4, qtyPerUnit: 15 },
  { itemId: 3, rawMaterialId: 30, qtyPerUnit: 4 },

  // Paneer Paratha
  { itemId: 4, rawMaterialId: 13, qtyPerUnit: 80 },
  { itemId: 4, rawMaterialId: 17, qtyPerUnit: 60 },
  { itemId: 4, rawMaterialId: 4, qtyPerUnit: 15 },
  { itemId: 4, rawMaterialId: 30, qtyPerUnit: 4 },

  // Gol Bhaji
  { itemId: 5, rawMaterialId: 3, qtyPerUnit: 70 },
  { itemId: 5, rawMaterialId: 5, qtyPerUnit: 30 },
  { itemId: 5, rawMaterialId: 4, qtyPerUnit: 40 },
  { itemId: 5, rawMaterialId: 30, qtyPerUnit: 4 },

  // Kanda Bhaji
  { itemId: 6, rawMaterialId: 5, qtyPerUnit: 100 },
  { itemId: 6, rawMaterialId: 3, qtyPerUnit: 45 },
  { itemId: 6, rawMaterialId: 4, qtyPerUnit: 35 },
  { itemId: 6, rawMaterialId: 30, qtyPerUnit: 4 },

  // Misal Pav (inactive)
  { itemId: 7, rawMaterialId: 1, qtyPerUnit: 2 },
  { itemId: 7, rawMaterialId: 7, qtyPerUnit: 80 },
  { itemId: 7, rawMaterialId: 8, qtyPerUnit: 25 },
  { itemId: 7, rawMaterialId: 4, qtyPerUnit: 20 },
  { itemId: 7, rawMaterialId: 5, qtyPerUnit: 20 },

  // Sheera (inactive)
  { itemId: 8, rawMaterialId: 11, qtyPerUnit: 70 },
  { itemId: 8, rawMaterialId: 21, qtyPerUnit: 50 },
  { itemId: 8, rawMaterialId: 24, qtyPerUnit: 20 },

  // Plain Maggie
  { itemId: 9, rawMaterialId: 18, qtyPerUnit: 1 },
  { itemId: 9, rawMaterialId: 4, qtyPerUnit: 5 },
  { itemId: 9, rawMaterialId: 5, qtyPerUnit: 15 },

  // Bread Patice
  { itemId: 10, rawMaterialId: 19, qtyPerUnit: 2 },
  { itemId: 10, rawMaterialId: 2, qtyPerUnit: 60 },
  { itemId: 10, rawMaterialId: 4, qtyPerUnit: 15 },
  { itemId: 10, rawMaterialId: 30, qtyPerUnit: 3 },

  // Vada Pav
  { itemId: 11, rawMaterialId: 1, qtyPerUnit: 1 },
  { itemId: 11, rawMaterialId: 2, qtyPerUnit: 60 },
  { itemId: 11, rawMaterialId: 3, qtyPerUnit: 20 },
  { itemId: 11, rawMaterialId: 4, qtyPerUnit: 12 },
  { itemId: 11, rawMaterialId: 6, qtyPerUnit: 10 },

  // Boil Egg
  { itemId: 12, rawMaterialId: 15, qtyPerUnit: 1 },

  // Egg Paratha
  { itemId: 13, rawMaterialId: 13, qtyPerUnit: 70 },
  { itemId: 13, rawMaterialId: 15, qtyPerUnit: 1 },
  { itemId: 13, rawMaterialId: 4, qtyPerUnit: 12 },
  { itemId: 13, rawMaterialId: 5, qtyPerUnit: 15 },

  // Omelette Pav
  { itemId: 14, rawMaterialId: 15, qtyPerUnit: 2 },
  { itemId: 14, rawMaterialId: 1, qtyPerUnit: 1 },
  { itemId: 14, rawMaterialId: 4, qtyPerUnit: 10 },
  { itemId: 14, rawMaterialId: 5, qtyPerUnit: 20 },
  { itemId: 14, rawMaterialId: 30, qtyPerUnit: 2 },

  // Rice Plate
  { itemId: 15, rawMaterialId: 12, qtyPerUnit: 150 },
  { itemId: 15, rawMaterialId: 27, qtyPerUnit: 40 },
  { itemId: 15, rawMaterialId: 28, qtyPerUnit: 80 },
  { itemId: 15, rawMaterialId: 13, qtyPerUnit: 60 },
  { itemId: 15, rawMaterialId: 4, qtyPerUnit: 15 },
  { itemId: 15, rawMaterialId: 30, qtyPerUnit: 6 },

  // Poori Bhaji Thali
  { itemId: 16, rawMaterialId: 9, qtyPerUnit: 100 },
  { itemId: 16, rawMaterialId: 2, qtyPerUnit: 120 },
  { itemId: 16, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 16, rawMaterialId: 12, qtyPerUnit: 80 },
  { itemId: 16, rawMaterialId: 27, qtyPerUnit: 30 },
  { itemId: 16, rawMaterialId: 30, qtyPerUnit: 6 },

  // Poori Bhaji
  { itemId: 17, rawMaterialId: 9, qtyPerUnit: 80 },
  { itemId: 17, rawMaterialId: 2, qtyPerUnit: 100 },
  { itemId: 17, rawMaterialId: 4, qtyPerUnit: 50 },
  { itemId: 17, rawMaterialId: 30, qtyPerUnit: 4 },

  // Egg Masala
  { itemId: 18, rawMaterialId: 15, qtyPerUnit: 2 },
  { itemId: 18, rawMaterialId: 5, qtyPerUnit: 60 },
  { itemId: 18, rawMaterialId: 29, qtyPerUnit: 50 },
  { itemId: 18, rawMaterialId: 4, qtyPerUnit: 20 },
  { itemId: 18, rawMaterialId: 30, qtyPerUnit: 8 },

  // Chicken Thali
  { itemId: 19, rawMaterialId: 16, qtyPerUnit: 200 },
  { itemId: 19, rawMaterialId: 5, qtyPerUnit: 80 },
  { itemId: 19, rawMaterialId: 29, qtyPerUnit: 60 },
  { itemId: 19, rawMaterialId: 4, qtyPerUnit: 30 },
  { itemId: 19, rawMaterialId: 30, qtyPerUnit: 12 },
  { itemId: 19, rawMaterialId: 12, qtyPerUnit: 100 },
  { itemId: 19, rawMaterialId: 13, qtyPerUnit: 60 },

  // Chicken Masala
  { itemId: 20, rawMaterialId: 16, qtyPerUnit: 500 },
  { itemId: 20, rawMaterialId: 5, qtyPerUnit: 150 },
  { itemId: 20, rawMaterialId: 29, qtyPerUnit: 120 },
  { itemId: 20, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 20, rawMaterialId: 30, qtyPerUnit: 25 },
  { itemId: 20, rawMaterialId: 31, qtyPerUnit: 10 },

  // Chapati
  { itemId: 21, rawMaterialId: 13, qtyPerUnit: 40 },
  { itemId: 21, rawMaterialId: 4, qtyPerUnit: 3 },

  // Bhakri
  { itemId: 22, rawMaterialId: 14, qtyPerUnit: 60 },

  // Tea
  { itemId: 23, rawMaterialId: 22, qtyPerUnit: 4 },
  { itemId: 23, rawMaterialId: 20, qtyPerUnit: 80 },
  { itemId: 23, rawMaterialId: 21, qtyPerUnit: 10 },

  // Coffee
  { itemId: 24, rawMaterialId: 23, qtyPerUnit: 4 },
  { itemId: 24, rawMaterialId: 20, qtyPerUnit: 120 },
  { itemId: 24, rawMaterialId: 21, qtyPerUnit: 12 },

  // Lassi
  { itemId: 25, rawMaterialId: 25, qtyPerUnit: 150 },
  { itemId: 25, rawMaterialId: 21, qtyPerUnit: 25 },
  { itemId: 25, rawMaterialId: 20, qtyPerUnit: 50 },

  // Masala Taak
  { itemId: 26, rawMaterialId: 25, qtyPerUnit: 100 },
  { itemId: 26, rawMaterialId: 30, qtyPerUnit: 3 },
  { itemId: 26, rawMaterialId: 31, qtyPerUnit: 2 },

  // Soda
  { itemId: 27, rawMaterialId: 26, qtyPerUnit: 1 },
];

export const SEED_CUSTOMERS: Customer[] = [];

export const SEED_SHOP: Shop = {
  id: 1,
  name: 'Aaisaheb Snacks Center',
  address: 'Shop 16, Nabhangan Society, Talegaon Dabhade',
  weeklyOff: 'Monday',
};

export const SEED_USERS: User[] = [
  { id: 1, name: 'Owner', role: 'owner', pin: '1234' },
  { id: 2, name: 'Helper', role: 'helper', pin: '1234' },
];

/**
 * Seed database if items table is empty.
 */
export async function seedDatabaseIfEmpty(): Promise<boolean> {
  let seeded = false;

  await db.transaction('rw', [
    db.shops,
    db.users,
    db.rawMaterials,
    db.items,
    db.recipes,
    db.stockMoves,
    db.customers,
  ], async () => {
    // Count must be read inside the transaction: reading it outside would
    // let two concurrent callers (e.g. React StrictMode's double-invoked
    // effect) both see an empty table and race to insert the same
    // hardcoded seed IDs, throwing ConstraintError.
    const count = await db.items.count();
    if (count > 0) {
      return;
    }

    await db.shops.add(SEED_SHOP);
    await db.users.bulkAdd(SEED_USERS);
    await db.rawMaterials.bulkAdd(SEED_RAW_MATERIALS);
    await db.items.bulkAdd(SEED_ITEMS);
    await db.recipes.bulkAdd(SEED_RECIPES as Recipe[]);
    if (SEED_CUSTOMERS.length > 0) {
      await db.customers.bulkAdd(SEED_CUSTOMERS);
    }

    // Initial stock moves for all raw materials
    const now = new Date().toISOString();
    const initialMoves: StockMove[] = SEED_RAW_MATERIALS.map((rm) => ({
      dayId: null,
      rmId: rm.id!,
      type: 'initial',
      qty: Math.round(rm.reorderLevel * 1.6),
      rate: rm.avgCost,
      reason: 'Initial opening stock',
      createdAt: now,
    }));

    await db.stockMoves.bulkAdd(initialMoves);
    seeded = true;
  });

  return seeded;
}
