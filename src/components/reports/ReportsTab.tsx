import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { db } from '../../db/schema';
import { useDayStore } from '../../store/dayStore';
import { StatCard } from '../common/StatCard';
import { Label } from '../common/Label';
import { formatRupees } from '../../lib/format';
import { computeWastageValue } from '../../lib/stockMoves';
import { computeSalesTrend, computeTopItems, computePnL } from '../../lib/reports';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: 8,
  fontSize: 12,
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface border border-line rounded-md p-4 mb-4">
    <Label>{title}</Label>
    <div className="mt-2">{children}</div>
  </div>
);

const Row: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
  /** Mint is reserved for money coming in; a loss must not read as a gain. */
  negative?: boolean;
}> = ({ label, value, strong, negative }) => (
  <div className="flex items-baseline justify-between py-1 text-body-m">
    <span className={strong ? 'font-semibold text-tx1' : 'text-tx2'}>{label}</span>
    <span
      className={`font-mono ${strong ? 'text-mono-l font-bold' : 'text-tx1 font-medium'}`}
      style={
        strong
          ? {
              color: negative
                ? 'var(--color-danger-text)'
                : 'var(--color-accent-text)',
            }
          : undefined
      }
    >
      {value}
    </span>
  </div>
);

export const ReportsTab: React.FC = () => {
  const openDay = useDayStore((state) => state.openDay);

  const closedDays = useLiveQuery(
    () => db.dayBook.filter((d) => d.status === 'closed').toArray(),
    []
  ) || [];
  const allSales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const allSaleLines = useLiveQuery(() => db.saleLines.toArray(), []) || [];
  const allExpenses = useLiveQuery(() => db.expenses.toArray(), []) || [];
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];
  const allStockMoves = useLiveQuery(() => db.stockMoves.toArray(), []) || [];
  const allRawMaterials = useLiveQuery(() => db.rawMaterials.toArray(), []) || [];

  const todaySnapshot = React.useMemo(() => {
    if (!openDay?.id) return undefined;
    const sales = allSales.filter((s) => s.dayId === openDay.id);
    const expenses = allExpenses.filter((e) => e.dayId === openDay.id);
    return {
      grossPaise: sales.reduce((sum, s) => sum + s.grossAmount, 0),
      cogsPaise: sales.reduce((sum, s) => sum + s.cogs, 0),
      expensesPaise: expenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [openDay?.id, allSales, allExpenses]);

  const trend = React.useMemo(
    () => computeSalesTrend(closedDays, todaySnapshot).map((p) => ({
      day: p.label,
      sales: p.salesPaise / 100,
      profit: p.profitPaise / 100,
    })),
    [closedDays, todaySnapshot]
  );

  const topItems = React.useMemo(
    () => computeTopItems(allSaleLines, allItems).map((t) => ({
      name: t.name,
      amount: t.amountPaise / 100,
    })),
    [allSaleLines, allItems]
  );

  const pnl = React.useMemo(() => computePnL(allSales, allExpenses), [allSales, allExpenses]);
  const wastageValuePaise = React.useMemo(
    () => computeWastageValue(allStockMoves, allRawMaterials),
    [allStockMoves, allRawMaterials]
  );

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Revenue" value={formatRupees(pnl.grossSalesPaise)} />
        <StatCard
          label="Net profit"
          value={formatRupees(pnl.netProfitPaise)}
          tone={pnl.netProfitPaise >= 0 ? 'good' : 'bad'}
        />
        <StatCard
          label="Margin"
          value={`${pnl.marginPct.toFixed(1)}%`}
          tone={pnl.marginPct < 0 ? 'bad' : pnl.marginPct >= 20 ? 'good' : 'brand'}
        />
        <StatCard label="Wastage" value={formatRupees(wastageValuePaise)} tone="bad" />
      </div>

      {/* Sales & profit trend */}
      {trend.length > 1 && (
        <Panel title="Sales & profit">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={trend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--color-tx3)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--color-tx3)" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--color-tx1)' }}
                formatter={(value) => `₹${Math.round(Number(value)).toLocaleString('en-IN')}`}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <Panel title="What actually sells">
          <ResponsiveContainer width="100%" height={30 + topItems.length * 26}>
            <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--color-tx3)"
                width={92}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => `₹${Math.round(Number(value)).toLocaleString('en-IN')}`}
              />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* P&L breakdown */}
      <Panel title="Profit and loss">
        <Row label="Gross sales" value={formatRupees(pnl.grossSalesPaise)} />
        <Row label="Platform commission" value={`− ${formatRupees(pnl.commissionPaise)}`} />
        <Row label="Cost of ingredients" value={`− ${formatRupees(pnl.cogsPaise)}`} />
        <Row label="Expenses" value={`− ${formatRupees(pnl.expensesPaise)}`} />
        <div className="border-t border-line mt-2 pt-2">
          <Row
            label="Net profit"
            value={formatRupees(pnl.netProfitPaise)}
            strong
            negative={pnl.netProfitPaise < 0}
          />
        </div>
      </Panel>

      {/* Closed days */}
      {closedDays.length > 0 && (
        <Panel title="Closed days">
          {[...closedDays].reverse().map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-line last:border-b-0">
              <span className="text-body-m text-tx1">
                {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-body-m text-tx1">
                  {formatRupees(d.grossSales ?? 0)}
                </span>
                {d.variance !== 0 && (
                  <span className="font-mono text-body-m" style={{ color: 'var(--color-danger-text)' }}>
                    {d.variance > 0 ? '+' : '−'}
                    {formatRupees(Math.abs(d.variance))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
};
