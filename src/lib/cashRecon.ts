/**
 * Pure functions for Day Book cash reconciliation.
 * All monetary amounts are integers in paise.
 */

/**
 * Computes expected cash in drawer:
 * openingCash + cashSales + cashIn - cashExpenses
 */
export function computeExpectedCash(
  openingCashPaise: number,
  cashSalesPaise: number,
  cashExpensesPaise: number,
  cashInPaise: number = 0
): number {
  return openingCashPaise + cashSalesPaise + cashInPaise - cashExpensesPaise;
}

/**
 * Computes cash variance:
 * countedCash - expectedCash (signed integer in paise)
 * Positive = surplus/excess, Negative = shortfall/deficit
 */
export function computeVariance(
  expectedCashPaise: number,
  countedCashPaise: number
): number {
  return countedCashPaise - expectedCashPaise;
}

/**
 * Checks whether the day close reconciliation is valid to submit.
 * A non-zero variance requires a mandatory non-empty explanatory note.
 */
export function isReconciliationValid(
  countedCashStr: string,
  expectedCashPaise: number,
  note: string
): boolean {
  if (countedCashStr.trim() === '') {
    return false;
  }
  const counted = Number(countedCashStr);
  if (isNaN(counted) || counted < 0) {
    return false;
  }
  const countedPaise = Math.round(counted * 100);
  const variance = computeVariance(expectedCashPaise, countedPaise);
  if (variance === 0) {
    return true;
  }
  return note.trim().length > 0;
}
