/**
 * Utility formatting functions for ShopBook.
 * Standardizes currency, date, and numbers.
 */

/**
 * Formats paise (integer) to Indian Rupee string: e.g. 2000 paise -> "₹20"
 */
export function formatRupees(paise: number): string {
  const rupees = Math.round((paise || 0) / 100);
  // The sign goes before the symbol. A loss used to print as "₹-396", which
  // reads as a stray character rather than a negative amount — and net profit
  // is the one figure on the screen most worth reading correctly.
  const sign = rupees < 0 ? '-' : '';
  return sign + '₹' + Math.abs(rupees).toLocaleString('en-IN');
}

/**
 * Formats a raw rupee value directly (e.g. for display): e.g. 20 -> "₹20"
 */
export function formatRupeesRaw(rupees: number): string {
  const whole = Math.round(rupees || 0);
  const sign = whole < 0 ? '-' : '';
  return sign + '₹' + Math.abs(whole).toLocaleString('en-IN');
}

/**
 * Formats a raw material's cost in the unit it is actually bought in.
 *
 * Most materials are costed per gram or millilitre, where the rate is a few
 * paise and rounds to "₹0". Scaling those to a kilo or litre gives the number
 * the shop would recognise from a supplier bill (e.g. besan at ₹90/kg).
 */
export function formatUnitRate(costPerUnitPaise: number, unit: string): string {
  if (unit === 'g') return `${formatRupees(costPerUnitPaise * 1000)}/kg`;
  if (unit === 'ml') return `${formatRupees(costPerUnitPaise * 1000)}/L`;

  // Cheap countable goods need the paise. A 91p chocolate rounded to "₹1"
  // reads as zero margin against its ₹1 price, hiding the 9% that is there.
  if (costPerUnitPaise > 0 && costPerUnitPaise % 100 !== 0 && costPerUnitPaise < 10000) {
    return `₹${(costPerUnitPaise / 100).toFixed(2)}/${unit}`;
  }

  return `${formatRupees(costPerUnitPaise)}/${unit}`;
}

/**
 * Converts rupee string/number to paise integer.
 */
export function toPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Converts paise to rupees (integer).
 */
export function toRupees(paise: number): number {
  return Math.round((paise || 0) / 100);
}

/**
 * Formats ISO date string into readable short date (e.g. "28 Aug").
 */
export function formatShortDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Formats header date (e.g. "FRI, 28 AUG").
 */
export function formatHeaderDate(isoString?: string): string {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
