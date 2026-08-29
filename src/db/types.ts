/**
 * ShopBook data model types.
 * All money values are in **paise** (integer). Never use floats for currency.
 */

export interface Shop {
  id?: number;
  name: string;
  address: string;
  weeklyOff: string;
}

export interface User {
  id?: number;
  name: string;
  role: 'owner' | 'helper';
  pin: string;
}

export type DayStatus = 'open' | 'closed';

export interface DayBook {
  id?: number;
  date: string; // ISO date string
  openingCash: number; // paise
  closingCashExpected: number; // paise
  closingCashCounted: number; // paise
  variance: number; // paise (counted − expected)
  note: string;
  status: DayStatus;
  closedAt?: string;
  // Snapshot at close for quick reads
  grossSales?: number; // paise
  totalCogs?: number; // paise
  totalExpenses?: number; // paise
}

export interface Item {
  id?: number;
  name: string;
  category: string;
  sellPriceCounter: number; // paise
  sellPriceOnline: number; // paise
  sortOrder: number;
  isActive: boolean;
}

export interface RawMaterial {
  id?: number;
  name: string;
  unit: string;
  /** Groups the shopping list by where it is bought (bakery, dairy, ...). */
  category: string;
  /** Weighted average cost per unit, in paise. */
  avgCost: number;
  /** Do NOT add currentQty here — stock is computed from stockMoves. */
  reorderLevel: number; // in base unit qty (not paise)
}

export interface Recipe {
  id?: number;
  itemId: number;
  rawMaterialId: number;
  qtyPerUnit: number; // how much RM per 1 unit of item
}

/** The shop takes cash and UPI, and lets regulars run a khata. No card machine. */
export type PaymentMode = 'Cash' | 'UPI' | 'Udhaar' | 'Platform';
export type SaleChannel = 'counter' | 'zomato' | 'swiggy';

export interface Sale {
  id?: number;
  dayId: number;
  channel: SaleChannel;
  orderRef?: string;
  grossAmount: number; // paise
  commissionAmt: number; // paise
  netAmount: number; // paise
  cogs: number; // paise
  paymentMode: PaymentMode;
  customerId?: number;
  createdBy?: string;
  createdAt: string;
  /**
   * Set on a reversing entry, pointing at the sale it cancels. Nothing is ever
   * deleted: a mistake is corrected by appending the opposite amounts, so both
   * the error and the correction stay on the record.
   */
  reversesSaleId?: number;
  /** Why the sale was reversed. Required on a reversing entry. */
  reversalReason?: string;
}

export interface SaleLine {
  id?: number;
  saleId: number;
  itemId: number;
  qty: number;
  rate: number; // paise per unit
  amount: number; // paise (qty × rate)
}

export type StockMoveType = 'initial' | 'in' | 'sale' | 'wastage' | 'audit' | 'reversal';

export interface StockMove {
  id?: number;
  dayId: number | null; // null for initial seed
  rmId: number;
  type: StockMoveType;
  qty: number; // positive = in, negative = out
  rate?: number; // cost per unit, paise (for purchases)
  reason?: string;
  createdAt: string;
}

export interface Purchase {
  id?: number;
  dayId: number;
  supplierId?: number;
  amount: number; // paise
  paymentMode: PaymentMode;
  billPhoto?: string;
}

export interface Expense {
  id?: number;
  dayId: number;
  category: string;
  amount: number; // paise
  paymentMode: PaymentMode;
  note: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  /**
   * Do NOT add an `outstanding` column here. What a customer owes is the sum
   * of their Udhaar sales minus the payments they have made, computed on read
   * — the same rule that keeps stock honest.
   */
}

/** Money received against a customer's khata. */
export interface Payment {
  id?: number;
  dayId: number;
  customerId: number;
  amount: number; // paise
  paymentMode: PaymentMode;
  note?: string;
  createdAt: string;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  outstanding: number; // paise
}

export interface Payout {
  id?: number;
  platform: string;
  periodFrom?: string;
  periodTo?: string;
  expectedAmount: number; // paise
  receivedAmount: number; // paise
  variance: number; // paise
}

export interface AuditLogEntry {
  id?: number;
  dayId?: number;
  userId?: number;
  action: string;
  detail: string;
  createdAt: string;
}

/** Cart item for in-memory use (not persisted) */
export interface CartItem {
  itemId: number;
  name: string;
  qty: number;
  rate: number; // paise per unit
  amount: number; // paise
}
