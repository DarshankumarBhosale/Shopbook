import type { Recipe, RawMaterial } from '../db/types';

export interface Shortage {
  rmId: number;
  name: string;
  unit: string;
  /** How much this cart needs. */
  neededQty: number;
  /** How much the ledger says is on hand. */
  haveQty: number;
}

/**
 * Pure function: raw materials this cart would push below zero.
 *
 * The flowchart routes every sale through a stock check. Selling into negative
 * stock is always possible — the food physically exists or it doesn't — but the
 * counter should know before it rings up, not discover it at the next count.
 */
export function computeShortages(
  cartLines: Array<{ itemId: number; qty: number }>,
  recipes: Recipe[],
  rawMaterials: RawMaterial[],
  stockMap: Record<number, number>
): Shortage[] {
  const needed = new Map<number, number>();

  for (const line of cartLines) {
    for (const recipe of recipes.filter((r) => r.itemId === line.itemId)) {
      const total = (needed.get(recipe.rawMaterialId) ?? 0) + recipe.qtyPerUnit * line.qty;
      needed.set(recipe.rawMaterialId, total);
    }
  }

  const shortages: Shortage[] = [];

  for (const [rmId, neededQty] of needed) {
    const haveQty = stockMap[rmId] ?? 0;
    if (haveQty >= neededQty) continue;

    const rm = rawMaterials.find((r) => r.id === rmId);
    shortages.push({
      rmId,
      name: rm?.name ?? `#${rmId}`,
      unit: rm?.unit ?? '',
      neededQty,
      haveQty,
    });
  }

  return shortages.sort((a, b) => a.name.localeCompare(b.name));
}
