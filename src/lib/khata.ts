import type { Sale, Payment, Customer } from '../db/types';

export interface KhataBalance {
  customerId: number;
  name: string;
  phone: string;
  /** Total ever taken on khata, in paise. */
  chargedPaise: number;
  /** Total ever repaid, in paise. */
  paidPaise: number;
  /** What is still owed, in paise. Never negative. */
  outstandingPaise: number;
  /** Whole days since the oldest unpaid Udhaar sale, or null if nothing is due. */
  daysOutstanding: number | null;
}

/**
 * Pure function: what each customer owes right now.
 *
 * Outstanding is derived — Udhaar sales minus payments received — never
 * stored, so a balance can always be traced back to the rows that made it.
 * Overpayment is clamped to zero rather than shown as a negative debt.
 */
export function computeKhataBalances(
  customers: Customer[],
  sales: Sale[],
  payments: Payment[],
  now: Date = new Date()
): KhataBalance[] {
  return customers
    .filter((c) => c.id !== undefined)
    .map((customer) => {
      const id = customer.id!;

      const theirSales = sales.filter(
        (s) => s.customerId === id && s.paymentMode === 'Udhaar'
      );
      const theirPayments = payments.filter((p) => p.customerId === id);

      const chargedPaise = theirSales.reduce((sum, s) => sum + s.grossAmount, 0);
      const paidPaise = theirPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingPaise = Math.max(0, chargedPaise - paidPaise);

      return {
        customerId: id,
        name: customer.name,
        phone: customer.phone,
        chargedPaise,
        paidPaise,
        outstandingPaise,
        daysOutstanding:
          outstandingPaise > 0 ? oldestUnpaidAgeDays(theirSales, now) : null,
      };
    })
    .sort((a, b) => b.outstandingPaise - a.outstandingPaise);
}

/**
 * Whole days since the earliest Udhaar sale. The shop settles khata at the
 * 9pm close each day, so anything showing 1+ days has already survived a
 * closing without being collected.
 */
function oldestUnpaidAgeDays(sales: Sale[], now: Date): number | null {
  if (sales.length === 0) return null;

  const oldest = sales.reduce((earliest, sale) =>
    sale.createdAt < earliest.createdAt ? sale : earliest
  );

  const ms = now.getTime() - new Date(oldest.createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;

  return Math.floor(ms / 86_400_000);
}

/** Pure function: total owed across every customer, in paise. */
export function computeTotalOutstanding(balances: KhataBalance[]): number {
  return balances.reduce((sum, b) => sum + b.outstandingPaise, 0);
}
