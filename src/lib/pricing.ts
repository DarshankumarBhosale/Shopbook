/**
 * Pure helpers for editing menu prices.
 * Prices are whole rupees on this menu, stored as integer paise.
 */

/**
 * Parses a typed price into paise.
 *
 * Returns null for anything that isn't a whole, non-negative rupee amount, so
 * a half-typed or nonsense value is rejected rather than silently written as
 * ₹0 — a wrong price on the board is worse than no change at all.
 */
export function parsePriceRupees(input: string): number | null {
  const trimmed = input.trim();

  if (trimmed === '' || !/^\d+$/.test(trimmed)) {
    return null;
  }

  const rupees = Number(trimmed);
  if (!Number.isSafeInteger(rupees) || rupees < 0) {
    return null;
  }

  return rupees * 100;
}

/**
 * The suggested online price for a counter price: counter + 30 %, rounded up
 * to the nearest ₹5, mirroring how the menu was seeded. Aggregators take a
 * commission, so the online list is marked up to absorb it.
 */
export function suggestOnlinePrice(counterPaise: number): number {
  if (counterPaise <= 0) return 0;
  const markedUp = counterPaise * 1.3;
  const fiveRupees = 500;
  return Math.ceil(markedUp / fiveRupees) * fiveRupees;
}
