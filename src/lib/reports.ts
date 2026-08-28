import type { DayBook, Sale, SaleLine, Item, Expense } from '../db/types';
import { formatShortDate } from './format';

export interface TrendPoint {
  label: string;
  salesPaise: number;
  profitPaise: number;
}

/**
 * Pure function: Sales/profit trend for the last N closed days, optionally with
 * today's (still-open) running totals appended as a final point.
 */
export function computeSalesTrend(
  closedDays: DayBook[],
  today?: { grossPaise: number; cogsPaise: number; expensesPaise: number },
  limit = 7
): TrendPoint[] {
  const points: TrendPoint[] = closedDays.slice(-limit).map((d) => ({
    label: formatShortDate(d.date),
    salesPaise: d.grossSales ?? 0,
    profitPaise: (d.grossSales ?? 0) - (d.totalCogs ?? 0) - (d.totalExpenses ?? 0),
  }));

  if (today) {
    points.push({
      label: 'Today',
      salesPaise: today.grossPaise,
      profitPaise: today.grossPaise - today.cogsPaise - today.expensesPaise,
    });
  }

  return points;
}

export interface TopItem {
  name: string;
  amountPaise: number;
}

/**
 * Pure function: Top-selling items by revenue (paise), across all sale lines given.
 */
export function computeTopItems(saleLines: SaleLine[], items: Item[], limit = 6): TopItem[] {
  const nameById = new Map(items.map((i) => [i.id, i.name]));
  const totals = new Map<number, number>();

  for (const line of saleLines) {
    totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.amount);
  }

  return [...totals.entries()]
    .map(([itemId, amountPaise]) => ({
      name: nameById.get(itemId) ?? `Item #${itemId}`,
      amountPaise,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, limit);
}

export interface PnL {
  grossSalesPaise: number;
  commissionPaise: number;
  cogsPaise: number;
  expensesPaise: number;
  netProfitPaise: number;
  marginPct: number;
}

/**
 * Pure function: Profit & loss roll-up across all sales and expenses given.
 * Margin is net profit as a percentage of gross sales.
 */
export function computePnL(sales: Sale[], expenses: Expense[]): PnL {
  const grossSalesPaise = sales.reduce((sum, s) => sum + s.grossAmount, 0);
  const netSalesPaise = sales.reduce((sum, s) => sum + s.netAmount, 0);
  const commissionPaise = grossSalesPaise - netSalesPaise;
  const cogsPaise = sales.reduce((sum, s) => sum + s.cogs, 0);
  const expensesPaise = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfitPaise = netSalesPaise - cogsPaise - expensesPaise;
  const marginPct = grossSalesPaise > 0 ? (netProfitPaise / grossSalesPaise) * 100 : 0;

  return { grossSalesPaise, commissionPaise, cogsPaise, expensesPaise, netProfitPaise, marginPct };
}
