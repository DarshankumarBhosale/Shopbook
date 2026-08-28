import { describe, it, expect } from 'vitest';
import { computeSalesTrend, computeTopItems, computePnL } from '../reports';
import type { DayBook, Sale, SaleLine, Item, Expense } from '../../db/types';

describe('reports pure functions', () => {
  describe('computeSalesTrend', () => {
    const closedDays: DayBook[] = [
      {
        id: 1, date: '2026-08-26T00:00:00Z', openingCash: 0, closingCashExpected: 0,
        closingCashCounted: 0, variance: 0, note: '', status: 'closed',
        grossSales: 10000, totalCogs: 4000, totalExpenses: 2000,
      },
      {
        id: 2, date: '2026-08-27T00:00:00Z', openingCash: 0, closingCashExpected: 0,
        closingCashCounted: 0, variance: 0, note: '', status: 'closed',
        grossSales: 12000, totalCogs: 5000, totalExpenses: 1000,
      },
    ];

    it('maps closed days to trend points with computed profit', () => {
      const trend = computeSalesTrend(closedDays);
      expect(trend).toHaveLength(2);
      expect(trend[0]).toMatchObject({ salesPaise: 10000, profitPaise: 4000 });
      expect(trend[1]).toMatchObject({ salesPaise: 12000, profitPaise: 6000 });
    });

    it('appends a "Today" point when today snapshot is given', () => {
      const trend = computeSalesTrend(closedDays, {
        grossPaise: 5000, cogsPaise: 2000, expensesPaise: 500,
      });
      expect(trend).toHaveLength(3);
      expect(trend[2]).toEqual({ label: 'Today', salesPaise: 5000, profitPaise: 2500 });
    });

    it('keeps only the most recent `limit` closed days', () => {
      const manyDays = Array.from({ length: 10 }, (_, i) => ({
        ...closedDays[0],
        id: i + 1,
        grossSales: i,
      }));
      const trend = computeSalesTrend(manyDays, undefined, 3);
      expect(trend).toHaveLength(3);
      expect(trend.map((p) => p.salesPaise)).toEqual([7, 8, 9]);
    });
  });

  describe('computeTopItems', () => {
    const items: Item[] = [
      { id: 1, name: 'Vada Pav', category: 'Snacks', sellPriceCounter: 2000, sellPriceOnline: 2600, sortOrder: 1, isActive: true },
      { id: 2, name: 'Chai', category: 'Drinks', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 2, isActive: true },
    ];
    const saleLines: SaleLine[] = [
      { saleId: 1, itemId: 1, qty: 2, rate: 2000, amount: 4000 },
      { saleId: 1, itemId: 2, qty: 1, rate: 1500, amount: 1500 },
      { saleId: 2, itemId: 1, qty: 3, rate: 2000, amount: 6000 },
    ];

    it('aggregates revenue per item, sorted descending', () => {
      const top = computeTopItems(saleLines, items);
      expect(top).toEqual([
        { name: 'Vada Pav', amountPaise: 10000 },
        { name: 'Chai', amountPaise: 1500 },
      ]);
    });

    it('respects the limit', () => {
      const top = computeTopItems(saleLines, items, 1);
      expect(top).toHaveLength(1);
      expect(top[0].name).toBe('Vada Pav');
    });

    it('falls back to a placeholder name for an unknown item', () => {
      const orphanLines: SaleLine[] = [{ saleId: 1, itemId: 99, qty: 1, rate: 100, amount: 100 }];
      const top = computeTopItems(orphanLines, items);
      expect(top[0].name).toBe('Item #99');
    });
  });

  describe('computePnL', () => {
    it('computes gross, commission, cogs, expenses, net profit and margin', () => {
      const sales: Sale[] = [
        {
          id: 1, dayId: 1, channel: 'counter', grossAmount: 10000, commissionAmt: 0,
          netAmount: 10000, cogs: 4000, paymentMode: 'Cash', createdAt: '2026-08-28T10:00:00Z',
        },
        {
          id: 2, dayId: 1, channel: 'zomato', grossAmount: 5000, commissionAmt: 1000,
          netAmount: 4000, cogs: 2000, paymentMode: 'Platform', createdAt: '2026-08-28T11:00:00Z',
        },
      ];
      const expenses: Expense[] = [
        { id: 1, dayId: 1, category: 'Rent', amount: 3000, paymentMode: 'Cash', note: '' },
      ];

      const pnl = computePnL(sales, expenses);

      expect(pnl.grossSalesPaise).toBe(15000);
      expect(pnl.commissionPaise).toBe(1000);
      expect(pnl.cogsPaise).toBe(6000);
      expect(pnl.expensesPaise).toBe(3000);
      // netSales(14000) - cogs(6000) - expenses(3000) = 5000
      expect(pnl.netProfitPaise).toBe(5000);
      expect(pnl.marginPct).toBeCloseTo((5000 / 15000) * 100, 5);
    });

    it('returns zero margin when there are no sales', () => {
      const pnl = computePnL([], []);
      expect(pnl.marginPct).toBe(0);
      expect(pnl.netProfitPaise).toBe(0);
    });
  });
});
