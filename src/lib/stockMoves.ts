import type { StockMove, Recipe, RawMaterial } from '../db/types';

/**
 * Pure function: Computes stock deduction moves for sale lines using the recipe BOM.
 * Returns signed stock moves (type 'sale' with negative quantity).
 */
export function computeStockMoves(
  saleLines: Array<{ itemId: number; qty: number }>,
  recipes: Recipe[],
  dayId: number,
  createdAt: string
): Omit<StockMove, 'id'>[] {
  const moves: Omit<StockMove, 'id'>[] = [];

  for (const line of saleLines) {
    const itemRecipes = recipes.filter((r) => r.itemId === line.itemId);
    for (const recipe of itemRecipes) {
      const deductionQty = -(recipe.qtyPerUnit * line.qty);
      moves.push({
        dayId,
        rmId: recipe.rawMaterialId,
        type: 'sale',
        qty: deductionQty,
        createdAt,
      });
    }
  }

  return moves;
}

/**
 * Pure function: Computes current stock for a specific raw material
 * as the sum of all its stock moves.
 */
export function computeCurrentStock(moves: StockMove[], rmId: number): number {
  return moves
    .filter((m) => m.rmId === rmId)
    .reduce((sum, m) => sum + m.qty, 0);
}

/**
 * Pure function: Computes current stock map for all raw materials.
 */
export function computeAllStock(
  moves: StockMove[],
  rawMaterials: RawMaterial[]
): Record<number, number> {
  const stockMap: Record<number, number> = {};
  for (const rm of rawMaterials) {
    if (rm.id !== undefined) {
      stockMap[rm.id] = 0;
    }
  }
  for (const move of moves) {
    stockMap[move.rmId] = (stockMap[move.rmId] || 0) + move.qty;
  }
  return stockMap;
}

/**
 * Pure function: Raw materials whose current stock has fallen below their reorder level.
 */
export function computeLowStock(
  rawMaterials: RawMaterial[],
  stockMap: Record<number, number>
): RawMaterial[] {
  return rawMaterials.filter(
    (rm) => rm.id !== undefined && (stockMap[rm.id] ?? 0) < rm.reorderLevel
  );
}

/**
 * Pure function: Total value (paise) of all wastage stock moves, priced at each
 * raw material's current average cost.
 */
export function computeWastageValue(moves: StockMove[], rawMaterials: RawMaterial[]): number {
  const avgCostByRm = new Map(rawMaterials.map((rm) => [rm.id, rm.avgCost]));
  return moves
    .filter((m) => m.type === 'wastage')
    .reduce((sum, m) => sum + Math.abs(m.qty) * (avgCostByRm.get(m.rmId) ?? 0), 0);
}
