import { describe, it, expect } from 'vitest';
import { computeLineCOGS, computeSaleCOGS } from '../cogs';
import { formatUnitRate } from '../format';
import type { Recipe, RawMaterial } from '../../db/types';

describe('cogs pure functions', () => {
  const rawMaterials: RawMaterial[] = [
    { id: 1, name: 'Pav', unit: 'pc', category: 'Test', avgCost: 400, reorderLevel: 100 }, // 400 paise = ₹4.00
    { id: 2, name: 'Potato', unit: 'g', category: 'Test', avgCost: 3, reorderLevel: 8000 }, // 3 paise/g
    { id: 3, name: 'Besan', unit: 'g', category: 'Test', avgCost: 9, reorderLevel: 3000 }, // 9 paise/g
    { id: 4, name: 'Oil', unit: 'ml', category: 'Test', avgCost: 14, reorderLevel: 4000 }, // 14 paise/ml
  ];

  const recipes: Recipe[] = [
    // Vada Pav (itemId: 1): 1 Pav (400) + 60g Potato (180) + 25g Besan (225) + 15ml Oil (210) = 1015 paise
    { itemId: 1, rawMaterialId: 1, qtyPerUnit: 1 },
    { itemId: 1, rawMaterialId: 2, qtyPerUnit: 60 },
    { itemId: 1, rawMaterialId: 3, qtyPerUnit: 25 },
    { itemId: 1, rawMaterialId: 4, qtyPerUnit: 15 },
  ];

  it('computes unit COGS in paise for one item line', () => {
    // 1 Vada Pav = 1*400 + 60*3 + 25*9 + 15*14 = 400 + 180 + 225 + 210 = 1015 paise (₹10.15)
    const cogs1 = computeLineCOGS(1, 1, recipes, rawMaterials);
    expect(cogs1).toBe(1015);

    // 2 Vada Pav = 1015 * 2 = 2030 paise
    const cogs2 = computeLineCOGS(1, 2, recipes, rawMaterials);
    expect(cogs2).toBe(2030);
  });

  it('computes total COGS for multiple sale lines', () => {
    const saleLines = [
      { itemId: 1, qty: 2 }, // 2030 paise
    ];

    const totalCogs = computeSaleCOGS(saleLines, recipes, rawMaterials);
    expect(totalCogs).toBe(2030);
  });
});

describe('formatUnitRate', () => {
  it('scales per-gram and per-ml rates to the unit a supplier bills in', () => {
    expect(formatUnitRate(9, 'g')).toBe('₹90/kg');
    expect(formatUnitRate(28, 'g')).toBe('₹280/kg');
    expect(formatUnitRate(6, 'ml')).toBe('₹60/L');
  });

  it('leaves countable units alone', () => {
    expect(formatUnitRate(700, 'pc')).toBe('₹7/pc');
    expect(formatUnitRate(400, 'pc')).toBe('₹4/pc');
  });
});
