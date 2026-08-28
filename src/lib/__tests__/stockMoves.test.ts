import { describe, it, expect } from 'vitest';
import {
  computeStockMoves,
  computeCurrentStock,
  computeAllStock,
  computeLowStock,
  computeWastageValue,
} from '../stockMoves';
import type { Recipe, StockMove, RawMaterial } from '../../db/types';

describe('stockMoves pure functions', () => {
  const recipes: Recipe[] = [
    // Vada Pav (itemId: 1): 1 Pav (rmId: 1), 60g Potato (rmId: 2), 25g Besan (rmId: 3)
    { itemId: 1, rawMaterialId: 1, qtyPerUnit: 1 },
    { itemId: 1, rawMaterialId: 2, qtyPerUnit: 60 },
    { itemId: 1, rawMaterialId: 3, qtyPerUnit: 25 },
    // Chai (itemId: 12): 5g Tea powder (rmId: 17), 100ml Milk (rmId: 18)
    { itemId: 12, rawMaterialId: 17, qtyPerUnit: 5 },
    { itemId: 12, rawMaterialId: 18, qtyPerUnit: 100 },
  ];

  it('computes negative stock moves correctly for sold items', () => {
    const saleLines = [
      { itemId: 1, qty: 2 }, // 2 Vada Pav
      { itemId: 12, qty: 3 }, // 3 Chai
    ];

    const moves = computeStockMoves(saleLines, recipes, 101, '2026-08-28T12:00:00Z');

    expect(moves).toHaveLength(5);
    // Pav: - (1 * 2) = -2
    expect(moves).toContainEqual({
      dayId: 101,
      rmId: 1,
      type: 'sale',
      qty: -2,
      createdAt: '2026-08-28T12:00:00Z',
    });
    // Potato: - (60 * 2) = -120
    expect(moves).toContainEqual({
      dayId: 101,
      rmId: 2,
      type: 'sale',
      qty: -120,
      createdAt: '2026-08-28T12:00:00Z',
    });
    // Milk: - (100 * 3) = -300
    expect(moves).toContainEqual({
      dayId: 101,
      rmId: 18,
      type: 'sale',
      qty: -300,
      createdAt: '2026-08-28T12:00:00Z',
    });
  });

  it('computes current stock as sum of moves for a raw material', () => {
    const moves: StockMove[] = [
      { dayId: null, rmId: 1, type: 'initial', qty: 160, createdAt: '2026-08-28T08:00:00Z' },
      { dayId: 101, rmId: 1, type: 'sale', qty: -20, createdAt: '2026-08-28T10:00:00Z' },
      { dayId: 101, rmId: 1, type: 'wastage', qty: -5, createdAt: '2026-08-28T11:00:00Z' },
      { dayId: 101, rmId: 1, type: 'in', qty: 50, createdAt: '2026-08-28T14:00:00Z' },
      // Other RM
      { dayId: 101, rmId: 2, type: 'sale', qty: -100, createdAt: '2026-08-28T10:00:00Z' },
    ];

    expect(computeCurrentStock(moves, 1)).toBe(185); // 160 - 20 - 5 + 50
    expect(computeCurrentStock(moves, 2)).toBe(-100);
    expect(computeCurrentStock(moves, 99)).toBe(0);
  });

  it('computes stock map for all raw materials', () => {
    const rawMaterials: RawMaterial[] = [
      { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
      { id: 2, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
      { id: 3, name: 'Besan', unit: 'g', avgCost: 9, reorderLevel: 3000 },
    ];

    const moves: StockMove[] = [
      { dayId: null, rmId: 1, type: 'initial', qty: 100, createdAt: '2026-08-28T08:00:00Z' },
      { dayId: 101, rmId: 1, type: 'sale', qty: -10, createdAt: '2026-08-28T10:00:00Z' },
      { dayId: null, rmId: 2, type: 'initial', qty: 5000, createdAt: '2026-08-28T08:00:00Z' },
    ];

    const stockMap = computeAllStock(moves, rawMaterials);
    expect(stockMap[1]).toBe(90);
    expect(stockMap[2]).toBe(5000);
    expect(stockMap[3]).toBe(0);
  });

  it('flags raw materials below their reorder level as low stock', () => {
    const rawMaterials: RawMaterial[] = [
      { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
      { id: 2, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
      { id: 3, name: 'Besan', unit: 'g', avgCost: 9, reorderLevel: 3000 },
    ];
    const stockMap = { 1: 50, 2: 9000, 3: 3000 };

    const lowStock = computeLowStock(rawMaterials, stockMap);

    expect(lowStock.map((r) => r.name)).toEqual(['Pav']);
  });

  it('computes total wastage value priced at current average cost', () => {
    const rawMaterials: RawMaterial[] = [
      { id: 1, name: 'Pav', unit: 'pc', avgCost: 400, reorderLevel: 100 },
      { id: 2, name: 'Potato', unit: 'g', avgCost: 3, reorderLevel: 8000 },
    ];
    const moves: StockMove[] = [
      { dayId: 101, rmId: 1, type: 'wastage', qty: -5, reason: 'Spoiled', createdAt: '2026-08-28T11:00:00Z' },
      { dayId: 101, rmId: 2, type: 'wastage', qty: -200, reason: 'Spilled', createdAt: '2026-08-28T11:05:00Z' },
      { dayId: 101, rmId: 1, type: 'sale', qty: -2, createdAt: '2026-08-28T10:00:00Z' },
    ];

    // 5 * 400 (Pav) + 200 * 3 (Potato) = 2000 + 600 = 2600
    expect(computeWastageValue(moves, rawMaterials)).toBe(2600);
  });
});
