import { describe, it, expect } from 'vitest';
import { computeShortages } from '../shortage';
import type { Recipe, RawMaterial } from '../../db/types';

const rawMaterials: RawMaterial[] = [
  { id: 1, name: 'Pav', unit: 'pc', category: 'Bakery', avgCost: 400, reorderLevel: 100 },
  { id: 2, name: 'Potato', unit: 'g', category: 'Vegetables', avgCost: 3, reorderLevel: 8000 },
];

// Vada Pav (item 11): 1 pav + 50g potato
const recipes: Recipe[] = [
  { itemId: 11, rawMaterialId: 1, qtyPerUnit: 1 },
  { itemId: 11, rawMaterialId: 2, qtyPerUnit: 50 },
];

describe('computeShortages', () => {
  it('is silent when there is enough on the shelf', () => {
    const shortages = computeShortages(
      [{ itemId: 11, qty: 2 }],
      recipes,
      rawMaterials,
      { 1: 10, 2: 500 }
    );
    expect(shortages).toEqual([]);
  });

  it('flags only the material that runs out', () => {
    // 3 vada pav needs 3 pav and 150g potato; only 2 pav on hand.
    const shortages = computeShortages(
      [{ itemId: 11, qty: 3 }],
      recipes,
      rawMaterials,
      { 1: 2, 2: 500 }
    );

    expect(shortages).toHaveLength(1);
    expect(shortages[0]).toMatchObject({ name: 'Pav', neededQty: 3, haveQty: 2 });
  });

  it('adds up demand across the whole cart before comparing', () => {
    // Two separate lines of the same dish still share one shelf.
    const shortages = computeShortages(
      [
        { itemId: 11, qty: 2 },
        { itemId: 11, qty: 2 },
      ],
      recipes,
      rawMaterials,
      { 1: 3, 2: 500 }
    );

    expect(shortages).toHaveLength(1);
    expect(shortages[0].neededQty).toBe(4);
  });

  it('treats a material with no ledger as zero on hand', () => {
    const shortages = computeShortages(
      [{ itemId: 11, qty: 1 }],
      recipes,
      rawMaterials,
      {}
    );
    expect(shortages.map((s) => s.name)).toEqual(['Pav', 'Potato']);
  });

  it('reports already-negative stock', () => {
    const shortages = computeShortages(
      [{ itemId: 11, qty: 1 }],
      recipes,
      rawMaterials,
      { 1: -5, 2: 500 }
    );
    expect(shortages[0]).toMatchObject({ name: 'Pav', haveQty: -5 });
  });

  it('ignores items with no recipe', () => {
    const shortages = computeShortages(
      [{ itemId: 999, qty: 5 }],
      recipes,
      rawMaterials,
      {}
    );
    expect(shortages).toEqual([]);
  });
});
