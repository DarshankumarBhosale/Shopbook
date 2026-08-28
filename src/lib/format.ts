/**
 * Utility formatting functions for ShopBook.
 * Standardizes currency, date, and numbers.
 */

/**
 * Formats paise (integer) to Indian Rupee string: e.g. 2000 paise -> "₹20"
 */
export function formatRupees(paise: number): string {
  const rupees = Math.round((paise || 0) / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}

/**
 * Formats a raw rupee value directly (e.g. for display): e.g. 20 -> "₹20"
 */
export function formatRupeesRaw(rupees: number): string {
  return '₹' + Math.round(rupees || 0).toLocaleString('en-IN');
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
