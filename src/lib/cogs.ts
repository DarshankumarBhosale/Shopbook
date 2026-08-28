import type { Recipe, RawMaterial } from '../db/types';

/**
 * Pure function: Computes COGS (Cost of Goods Sold) in paise for a single item and quantity.
 * Multiplies raw material quantity by its avgCost (in paise).
 */
export function computeLineCOGS(
  itemId: number,
  qty: number,
  recipes: Recipe[],
  rawMaterials: RawMaterial[]
): number {
  const itemRecipes = recipes.filter((r) => r.itemId === itemId);
  let unitCostPaise = 0;

  for (const recipe of itemRecipes) {
    const rm = rawMaterials.find((r) => r.id === recipe.rawMaterialId);
    if (rm) {
      unitCostPaise += recipe.qtyPerUnit * rm.avgCost;
    }
  }

  return Math.round(unitCostPaise * qty);
}

/**
 * Pure function: Computes total COGS in paise for an array of sale lines.
 */
export function computeSaleCOGS(
  saleLines: Array<{ itemId: number; qty: number }>,
  recipes: Recipe[],
  rawMaterials: RawMaterial[]
): number {
  return saleLines.reduce((total, line) => {
    return total + computeLineCOGS(line.itemId, line.qty, recipes, rawMaterials);
  }, 0);
}
