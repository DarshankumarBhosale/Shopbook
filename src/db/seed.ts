import { db } from './schema';
import type { RawMaterial, Item, Recipe, StockMove, User, Shop, Customer } from './types';

export const SEED_RAW_MATERIALS: RawMaterial[] = [
  { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
  { id: 2, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
  { id: 3, name: 'Besan', unit: 'g', avgCost: 9, reorderLevel: 3000 },
  { id: 4, name: 'Oil', unit: 'ml', avgCost: 14, reorderLevel: 4000 },
  { id: 5, name: 'Onion', unit: 'g', avgCost: 4, reorderLevel: 6000 },
  { id: 6, name: 'Chutney', unit: 'g', avgCost: 12, reorderLevel: 1500 },
  { id: 7, name: 'Matki', unit: 'g', avgCost: 11, reorderLevel: 3000 },
  { id: 8, name: 'Farsan', unit: 'g', avgCost: 18, reorderLevel: 2000 },
  { id: 9, name: 'Maida', unit: 'g', avgCost: 5, reorderLevel: 2000 },
  { id: 10, name: 'Poha', unit: 'g', avgCost: 6, reorderLevel: 3000 },
  { id: 11, name: 'Rava', unit: 'g', avgCost: 5, reorderLevel: 3000 },
  { id: 12, name: 'Sabudana', unit: 'g', avgCost: 11, reorderLevel: 2500 },
  { id: 13, name: 'Peanut', unit: 'g', avgCost: 14, reorderLevel: 1500 },
  { id: 14, name: 'Idli batter', unit: 'g', avgCost: 5, reorderLevel: 4000 },
  { id: 15, name: 'Dosa batter', unit: 'g', avgCost: 5, reorderLevel: 4000 },
  { id: 16, name: 'Sambar', unit: 'ml', avgCost: 4, reorderLevel: 4000 },
  { id: 17, name: 'Tea powder', unit: 'g', avgCost: 45, reorderLevel: 500 },
  { id: 18, name: 'Milk', unit: 'ml', avgCost: 6, reorderLevel: 8000 },
  { id: 19, name: 'Sugar', unit: 'g', avgCost: 5, reorderLevel: 3000 },
  { id: 20, name: 'Ghee', unit: 'g', avgCost: 60, reorderLevel: 800 },
  { id: 21, name: 'Coffee powder', unit: 'g', avgCost: 90, reorderLevel: 300 },
  { id: 22, name: 'Cold drink', unit: 'pc', avgCost: 1400, reorderLevel: 24 },
  { id: 23, name: 'Paper bag', unit: 'pc', avgCost: 120, reorderLevel: 200 },
];

export const SEED_ITEMS: Item[] = [
  { id: 1, name: 'Vada Pav', category: 'Snacks', sellPriceCounter: 2000, sellPriceOnline: 2600, sortOrder: 1, isActive: true },
  { id: 2, name: 'Misal Pav', category: 'Snacks', sellPriceCounter: 7000, sellPriceOnline: 9200, sortOrder: 2, isActive: true },
  { id: 3, name: 'Batata Vada', category: 'Snacks', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 3, isActive: true },
  { id: 4, name: 'Samosa', category: 'Snacks', sellPriceCounter: 2000, sellPriceOnline: 2600, sortOrder: 4, isActive: true },
  { id: 5, name: 'Kanda Bhaji', category: 'Snacks', sellPriceCounter: 5000, sellPriceOnline: 6600, sortOrder: 5, isActive: true },
  { id: 6, name: 'Poha', category: 'Breakfast', sellPriceCounter: 3000, sellPriceOnline: 4000, sortOrder: 6, isActive: true },
  { id: 7, name: 'Upma', category: 'Breakfast', sellPriceCounter: 3000, sellPriceOnline: 4000, sortOrder: 7, isActive: true },
  { id: 8, name: 'Sabudana Khichdi', category: 'Breakfast', sellPriceCounter: 6000, sellPriceOnline: 7800, sortOrder: 8, isActive: true },
  { id: 9, name: 'Idli Sambar', category: 'South', sellPriceCounter: 5000, sellPriceOnline: 6600, sortOrder: 9, isActive: true },
  { id: 10, name: 'Sada Dosa', category: 'South', sellPriceCounter: 7000, sellPriceOnline: 9200, sortOrder: 10, isActive: true },
  { id: 11, name: 'Sheera', category: 'Sweet', sellPriceCounter: 3000, sellPriceOnline: 4000, sortOrder: 11, isActive: true },
  { id: 12, name: 'Chai', category: 'Drinks', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 12, isActive: true },
  { id: 13, name: 'Coffee', category: 'Drinks', sellPriceCounter: 2000, sellPriceOnline: 2600, sortOrder: 13, isActive: true },
  { id: 14, name: 'Cold Drink', category: 'Drinks', sellPriceCounter: 2000, sellPriceOnline: 2400, sortOrder: 14, isActive: true },
];

export const SEED_RECIPES: Omit<Recipe, 'id'>[] = [
  // Vada Pav: [[1,1],[2,60],[3,25],[4,15],[6,10]]
  { itemId: 1, rawMaterialId: 1, qtyPerUnit: 1 },
  { itemId: 1, rawMaterialId: 2, qtyPerUnit: 60 },
  { itemId: 1, rawMaterialId: 3, qtyPerUnit: 25 },
  { itemId: 1, rawMaterialId: 4, qtyPerUnit: 15 },
  { itemId: 1, rawMaterialId: 6, qtyPerUnit: 10 },

  // Misal Pav: [[1,2],[7,80],[4,20],[5,20],[8,25]]
  { itemId: 2, rawMaterialId: 1, qtyPerUnit: 2 },
  { itemId: 2, rawMaterialId: 7, qtyPerUnit: 80 },
  { itemId: 2, rawMaterialId: 4, qtyPerUnit: 20 },
  { itemId: 2, rawMaterialId: 5, qtyPerUnit: 20 },
  { itemId: 2, rawMaterialId: 8, qtyPerUnit: 25 },

  // Batata Vada: [[2,60],[3,25],[4,15]]
  { itemId: 3, rawMaterialId: 2, qtyPerUnit: 60 },
  { itemId: 3, rawMaterialId: 3, qtyPerUnit: 25 },
  { itemId: 3, rawMaterialId: 4, qtyPerUnit: 15 },

  // Samosa: [[9,30],[2,50],[4,20]]
  { itemId: 4, rawMaterialId: 9, qtyPerUnit: 30 },
  { itemId: 4, rawMaterialId: 2, qtyPerUnit: 50 },
  { itemId: 4, rawMaterialId: 4, qtyPerUnit: 20 },

  // Kanda Bhaji: [[5,100],[3,40],[4,30]]
  { itemId: 5, rawMaterialId: 5, qtyPerUnit: 100 },
  { itemId: 5, rawMaterialId: 3, qtyPerUnit: 40 },
  { itemId: 5, rawMaterialId: 4, qtyPerUnit: 30 },

  // Poha: [[10,80],[5,20],[4,10]]
  { itemId: 6, rawMaterialId: 10, qtyPerUnit: 80 },
  { itemId: 6, rawMaterialId: 5, qtyPerUnit: 20 },
  { itemId: 6, rawMaterialId: 4, qtyPerUnit: 10 },

  // Upma: [[11,80],[4,10],[5,15]]
  { itemId: 7, rawMaterialId: 11, qtyPerUnit: 80 },
  { itemId: 7, rawMaterialId: 4, qtyPerUnit: 10 },
  { itemId: 7, rawMaterialId: 5, qtyPerUnit: 15 },

  // Sabudana Khichdi: [[12,90],[13,20],[4,15]]
  { itemId: 8, rawMaterialId: 12, qtyPerUnit: 90 },
  { itemId: 8, rawMaterialId: 13, qtyPerUnit: 20 },
  { itemId: 8, rawMaterialId: 4, qtyPerUnit: 15 },

  // Idli Sambar: [[14,150],[16,150]]
  { itemId: 9, rawMaterialId: 14, qtyPerUnit: 150 },
  { itemId: 9, rawMaterialId: 16, qtyPerUnit: 150 },

  // Sada Dosa: [[15,120],[4,15]]
  { itemId: 10, rawMaterialId: 15, qtyPerUnit: 120 },
  { itemId: 10, rawMaterialId: 4, qtyPerUnit: 15 },

  // Sheera: [[11,70],[19,50],[20,20]]
  { itemId: 11, rawMaterialId: 11, qtyPerUnit: 70 },
  { itemId: 11, rawMaterialId: 19, qtyPerUnit: 50 },
  { itemId: 11, rawMaterialId: 20, qtyPerUnit: 20 },

  // Chai: [[17,5],[18,100],[19,12]]
  { itemId: 12, rawMaterialId: 17, qtyPerUnit: 5 },
  { itemId: 12, rawMaterialId: 18, qtyPerUnit: 100 },
  { itemId: 12, rawMaterialId: 19, qtyPerUnit: 12 },

  // Coffee: [[21,4],[18,120],[19,12]]
  { itemId: 13, rawMaterialId: 21, qtyPerUnit: 4 },
  { itemId: 13, rawMaterialId: 18, qtyPerUnit: 120 },
  { itemId: 13, rawMaterialId: 19, qtyPerUnit: 12 },

  // Cold Drink: [[22,1]]
  { itemId: 14, rawMaterialId: 22, qtyPerUnit: 1 },
];

export const SEED_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Auto stand bhaiya', phone: '9820011223', outstanding: 0 },
  { id: 2, name: 'Salon next door', phone: '9730044556', outstanding: 0 },
];

export const SEED_SHOP: Shop = {
  id: 1,
  name: 'ShopBook Pune Snacks',
  address: 'FC Road, Pune',
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
    await db.customers.bulkAdd(SEED_CUSTOMERS);

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
