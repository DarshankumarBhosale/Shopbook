import { db } from './schema';
import type { RawMaterial, Item, Recipe, StockMove, User, Shop, Customer } from './types';

/**
 * Raw material master for Aaisaheb Snacks Center.
 *
 * Units follow the shop's own recipe book ("Standardized Recipe & Raw Material
 * Specifications"), which is stated in grams throughout — so oil and milk are
 * tracked in grams, not millilitres. Only genuinely countable items (pav, eggs,
 * bread slices, Maggi packets) use `pc`.
 *
 * `avgCost` is per base unit in paise and is a starting estimate. Each one is
 * overwritten by the real rate the first time that material is bought in
 * through Stock In.
 */
export const SEED_RAW_MATERIALS: RawMaterial[] = [
  { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
  { id: 2, name: 'Rava (semolina)', unit: 'g', avgCost: 5, reorderLevel: 2000 },
  { id: 3, name: 'Poha', unit: 'g', avgCost: 6, reorderLevel: 2000 },
  { id: 4, name: 'Wheat flour', unit: 'g', avgCost: 5, reorderLevel: 8000 },
  { id: 5, name: 'Jowar / bajra flour', unit: 'g', avgCost: 6, reorderLevel: 3000 },
  { id: 6, name: 'Rice', unit: 'g', avgCost: 6, reorderLevel: 6000 },
  { id: 7, name: 'Toor dal', unit: 'g', avgCost: 14, reorderLevel: 2000 },
  { id: 8, name: 'Besan (gram flour)', unit: 'g', avgCost: 9, reorderLevel: 3000 },
  { id: 9, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
  { id: 10, name: 'Onion', unit: 'g', avgCost: 4, reorderLevel: 8000 },
  { id: 11, name: 'Tomato', unit: 'g', avgCost: 4, reorderLevel: 3000 },
  { id: 12, name: 'Mixed vegetables', unit: 'g', avgCost: 5, reorderLevel: 4000 },
  { id: 13, name: 'Peanuts', unit: 'g', avgCost: 14, reorderLevel: 1000 },
  { id: 14, name: 'Paneer', unit: 'g', avgCost: 40, reorderLevel: 1000 },
  { id: 15, name: 'Egg', unit: 'pc', avgCost: 700, reorderLevel: 60 },
  { id: 16, name: 'Chicken (bone-in)', unit: 'g', avgCost: 28, reorderLevel: 5000 },
  { id: 17, name: 'Coconut', unit: 'g', avgCost: 25, reorderLevel: 500 },
  { id: 18, name: 'Milk', unit: 'g', avgCost: 6, reorderLevel: 5000 },
  { id: 19, name: 'Curd', unit: 'g', avgCost: 8, reorderLevel: 3000 },
  { id: 20, name: 'Sugar', unit: 'g', avgCost: 5, reorderLevel: 2000 },
  { id: 21, name: 'Tea powder', unit: 'g', avgCost: 45, reorderLevel: 300 },
  { id: 22, name: 'Coffee powder', unit: 'g', avgCost: 90, reorderLevel: 200 },
  { id: 23, name: 'Refined oil', unit: 'g', avgCost: 15, reorderLevel: 5000 },
  { id: 24, name: 'Ginger-garlic paste', unit: 'g', avgCost: 20, reorderLevel: 1000 },
  { id: 25, name: 'Dry garlic chutney', unit: 'g', avgCost: 12, reorderLevel: 1000 },
  { id: 26, name: 'Spice mix & salt', unit: 'g', avgCost: 35, reorderLevel: 1500 },
  { id: 27, name: 'Coriander & green chili', unit: 'g', avgCost: 10, reorderLevel: 500 },
  { id: 28, name: 'Maggi noodles', unit: 'pc', avgCost: 1200, reorderLevel: 30 },
  { id: 29, name: 'Bread slice', unit: 'pc', avgCost: 150, reorderLevel: 100 },
  { id: 30, name: 'Sweet (sheera / gulab jamun)', unit: 'g', avgCost: 20, reorderLevel: 1000 },
  { id: 31, name: 'Soda water', unit: 'g', avgCost: 2, reorderLevel: 5000 },
  { id: 32, name: 'Syrup', unit: 'g', avgCost: 20, reorderLevel: 500 },
];

/**
 * Menu for Aaisaheb Snacks Center, Talegaon Dabhade.
 * Counter prices match the shop's recipe book. Online prices are counter + ~30 %,
 * rounded up to the nearest ₹5, to absorb aggregator commission.
 *
 * Misal Pav and Sheera are on the printed menu but seeded inactive: Misal Pav is
 * currently not available, and Sheera has no price and no standalone recipe.
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
 * Recipe (bill of materials) per one unit sold, taken from the shop's
 * standardized recipe book.
 *
 * Two deliberate departures from the printed sheets:
 *   • Water is not modelled. It carries no cost and no reorder level, so it
 *     would only clutter the stock list.
 *   • Where a sheet gives one combined line for several materials ("Onion &
 *     Coriander 15 g", "Oil & Spices 30 g"), the weight is split across the
 *     individual materials so each one depletes on its own.
 *
 * Chicken Masala is a 1 kg batch, exactly as the recipe book states, so one
 * sale deducts a full kilo of chicken.
 */
export const SEED_RECIPES: Omit<Recipe, 'id'>[] = [
  // Plain Upma — rava 50, onion 25, oil 15, peanuts 10, spices 5
  { itemId: 1, rawMaterialId: 2, qtyPerUnit: 50 },
  { itemId: 1, rawMaterialId: 10, qtyPerUnit: 25 },
  { itemId: 1, rawMaterialId: 23, qtyPerUnit: 15 },
  { itemId: 1, rawMaterialId: 13, qtyPerUnit: 10 },
  { itemId: 1, rawMaterialId: 26, qtyPerUnit: 5 },

  // Poha — poha 60, onion 30, peanuts 15, oil 15, (chili+coriander+salt+turmeric 10)
  { itemId: 2, rawMaterialId: 3, qtyPerUnit: 60 },
  { itemId: 2, rawMaterialId: 10, qtyPerUnit: 30 },
  { itemId: 2, rawMaterialId: 13, qtyPerUnit: 15 },
  { itemId: 2, rawMaterialId: 23, qtyPerUnit: 15 },
  { itemId: 2, rawMaterialId: 27, qtyPerUnit: 5 },
  { itemId: 2, rawMaterialId: 26, qtyPerUnit: 5 },

  // Aloo Paratha — wheat 60, potato 50, (onion+coriander 15), oil 15, spices 5
  { itemId: 3, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 3, rawMaterialId: 9, qtyPerUnit: 50 },
  { itemId: 3, rawMaterialId: 10, qtyPerUnit: 10 },
  { itemId: 3, rawMaterialId: 27, qtyPerUnit: 5 },
  { itemId: 3, rawMaterialId: 23, qtyPerUnit: 15 },
  { itemId: 3, rawMaterialId: 26, qtyPerUnit: 5 },

  // Paneer Paratha — wheat 60, paneer 50, (onion+coriander 10), oil 15, spices 5
  { itemId: 4, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 4, rawMaterialId: 14, qtyPerUnit: 50 },
  { itemId: 4, rawMaterialId: 10, qtyPerUnit: 6 },
  { itemId: 4, rawMaterialId: 27, qtyPerUnit: 4 },
  { itemId: 4, rawMaterialId: 23, qtyPerUnit: 15 },
  { itemId: 4, rawMaterialId: 26, qtyPerUnit: 5 },

  // Gol Bhaji — besan 50, mixed veg 40, oil 20, spices 5
  { itemId: 5, rawMaterialId: 8, qtyPerUnit: 50 },
  { itemId: 5, rawMaterialId: 12, qtyPerUnit: 40 },
  { itemId: 5, rawMaterialId: 23, qtyPerUnit: 20 },
  { itemId: 5, rawMaterialId: 26, qtyPerUnit: 5 },

  // Kanda Bhaji — onion 70, besan 40, oil 20, spices 5
  { itemId: 6, rawMaterialId: 10, qtyPerUnit: 70 },
  { itemId: 6, rawMaterialId: 8, qtyPerUnit: 40 },
  { itemId: 6, rawMaterialId: 23, qtyPerUnit: 20 },
  { itemId: 6, rawMaterialId: 26, qtyPerUnit: 5 },

  // Misal Pav (7) and Sheera (8) are inactive and have no recipe yet.

  // Plain Maggie — one 70 g packet with its tastemaker
  { itemId: 9, rawMaterialId: 28, qtyPerUnit: 1 },

  // Bread Patice — bread 2 pc, potato 40, besan 30, oil 25
  { itemId: 10, rawMaterialId: 29, qtyPerUnit: 2 },
  { itemId: 10, rawMaterialId: 9, qtyPerUnit: 40 },
  { itemId: 10, rawMaterialId: 8, qtyPerUnit: 30 },
  { itemId: 10, rawMaterialId: 23, qtyPerUnit: 25 },

  // Vada Pav — pav 1, potato 50, besan 20, oil 15, chutney 10
  { itemId: 11, rawMaterialId: 1, qtyPerUnit: 1 },
  { itemId: 11, rawMaterialId: 9, qtyPerUnit: 50 },
  { itemId: 11, rawMaterialId: 8, qtyPerUnit: 20 },
  { itemId: 11, rawMaterialId: 23, qtyPerUnit: 15 },
  { itemId: 11, rawMaterialId: 25, qtyPerUnit: 10 },

  // Boil Egg — egg 1, salt/pepper 1
  { itemId: 12, rawMaterialId: 15, qtyPerUnit: 1 },
  { itemId: 12, rawMaterialId: 26, qtyPerUnit: 1 },

  // Egg Paratha — wheat 60, egg 1, (onion+chili 10), oil 15
  { itemId: 13, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 13, rawMaterialId: 15, qtyPerUnit: 1 },
  { itemId: 13, rawMaterialId: 10, qtyPerUnit: 6 },
  { itemId: 13, rawMaterialId: 27, qtyPerUnit: 4 },
  { itemId: 13, rawMaterialId: 23, qtyPerUnit: 15 },

  // Omelette Pav — eggs 2, (onion+tomato+chili 20), pav 2, oil 15
  { itemId: 14, rawMaterialId: 15, qtyPerUnit: 2 },
  { itemId: 14, rawMaterialId: 10, qtyPerUnit: 12 },
  { itemId: 14, rawMaterialId: 11, qtyPerUnit: 5 },
  { itemId: 14, rawMaterialId: 27, qtyPerUnit: 3 },
  { itemId: 14, rawMaterialId: 1, qtyPerUnit: 2 },
  { itemId: 14, rawMaterialId: 23, qtyPerUnit: 15 },

  // Rice Plate — rice 100, dal 30, veg 100, chapati (wheat 60), (oil+spices 30)
  { itemId: 15, rawMaterialId: 6, qtyPerUnit: 100 },
  { itemId: 15, rawMaterialId: 7, qtyPerUnit: 30 },
  { itemId: 15, rawMaterialId: 12, qtyPerUnit: 100 },
  { itemId: 15, rawMaterialId: 4, qtyPerUnit: 60 },
  { itemId: 15, rawMaterialId: 23, qtyPerUnit: 22 },
  { itemId: 15, rawMaterialId: 26, qtyPerUnit: 8 },

  // Poori Bhaji Thali — wheat 80, potato 100, dal 50, rice 50, sweet 50, oil 45
  { itemId: 16, rawMaterialId: 4, qtyPerUnit: 80 },
  { itemId: 16, rawMaterialId: 9, qtyPerUnit: 100 },
  { itemId: 16, rawMaterialId: 7, qtyPerUnit: 50 },
  { itemId: 16, rawMaterialId: 6, qtyPerUnit: 50 },
  { itemId: 16, rawMaterialId: 30, qtyPerUnit: 50 },
  { itemId: 16, rawMaterialId: 23, qtyPerUnit: 45 },

  // Poori Bhaji — wheat 80, potato 100, (onion+spices 30), oil 35
  { itemId: 17, rawMaterialId: 4, qtyPerUnit: 80 },
  { itemId: 17, rawMaterialId: 9, qtyPerUnit: 100 },
  { itemId: 17, rawMaterialId: 10, qtyPerUnit: 20 },
  { itemId: 17, rawMaterialId: 26, qtyPerUnit: 10 },
  { itemId: 17, rawMaterialId: 23, qtyPerUnit: 35 },

  // Egg Masala — eggs 2, onion gravy 60, tomato puree 40, oil 20, masala 10
  { itemId: 18, rawMaterialId: 15, qtyPerUnit: 2 },
  { itemId: 18, rawMaterialId: 10, qtyPerUnit: 60 },
  { itemId: 18, rawMaterialId: 11, qtyPerUnit: 40 },
  { itemId: 18, rawMaterialId: 23, qtyPerUnit: 20 },
  { itemId: 18, rawMaterialId: 26, qtyPerUnit: 10 },

  // Chicken Thali — chicken 150, (gravy base 80), oil 30, rice 60, chapati (wheat 60)
  { itemId: 19, rawMaterialId: 16, qtyPerUnit: 150 },
  { itemId: 19, rawMaterialId: 10, qtyPerUnit: 40 },
  { itemId: 19, rawMaterialId: 11, qtyPerUnit: 25 },
  { itemId: 19, rawMaterialId: 17, qtyPerUnit: 15 },
  { itemId: 19, rawMaterialId: 23, qtyPerUnit: 30 },
  { itemId: 19, rawMaterialId: 6, qtyPerUnit: 60 },
  { itemId: 19, rawMaterialId: 4, qtyPerUnit: 60 },

  // Chicken Masala — 1 kg batch
  { itemId: 20, rawMaterialId: 16, qtyPerUnit: 1000 },
  { itemId: 20, rawMaterialId: 10, qtyPerUnit: 250 },
  { itemId: 20, rawMaterialId: 11, qtyPerUnit: 150 },
  { itemId: 20, rawMaterialId: 24, qtyPerUnit: 50 },
  { itemId: 20, rawMaterialId: 23, qtyPerUnit: 100 },
  { itemId: 20, rawMaterialId: 26, qtyPerUnit: 50 },

  // Chapati — wheat 30
  { itemId: 21, rawMaterialId: 4, qtyPerUnit: 30 },

  // Bhakri — jowar 45
  { itemId: 22, rawMaterialId: 5, qtyPerUnit: 45 },

  // Tea — milk 50, sugar 10, tea powder 3
  { itemId: 23, rawMaterialId: 18, qtyPerUnit: 50 },
  { itemId: 23, rawMaterialId: 20, qtyPerUnit: 10 },
  { itemId: 23, rawMaterialId: 21, qtyPerUnit: 3 },

  // Coffee — milk 80, sugar 10, coffee powder 3
  { itemId: 24, rawMaterialId: 18, qtyPerUnit: 80 },
  { itemId: 24, rawMaterialId: 20, qtyPerUnit: 10 },
  { itemId: 24, rawMaterialId: 22, qtyPerUnit: 3 },

  // Lassi — curd 150, sugar 30
  { itemId: 25, rawMaterialId: 19, qtyPerUnit: 150 },
  { itemId: 25, rawMaterialId: 20, qtyPerUnit: 30 },

  // Masala Taak — curd 50, spices 5
  { itemId: 26, rawMaterialId: 19, qtyPerUnit: 50 },
  { itemId: 26, rawMaterialId: 26, qtyPerUnit: 5 },

  // Soda — soda water 200, syrup 10
  { itemId: 27, rawMaterialId: 31, qtyPerUnit: 200 },
  { itemId: 27, rawMaterialId: 32, qtyPerUnit: 10 },
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

    // Seeding is gated on `items` being empty, but it writes to seven tables —
    // and a schema upgrade may deliberately preserve some of them (shops and
    // users survive the v3 rebuild). Rows carrying explicit IDs therefore have
    // to upsert: a plain add would collide, throw ConstraintError, and roll the
    // whole transaction back, leaving the app with no menu at all.
    // Recipes and stock moves use auto-increment IDs, so they are added.
    await db.shops.put(SEED_SHOP);
    await db.users.bulkPut(SEED_USERS);
    await db.rawMaterials.bulkPut(SEED_RAW_MATERIALS);
    await db.items.bulkPut(SEED_ITEMS);
    await db.recipes.bulkAdd(SEED_RECIPES as Recipe[]);
    if (SEED_CUSTOMERS.length > 0) {
      await db.customers.bulkPut(SEED_CUSTOMERS);
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
