import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { ExpenseEntry } from './ExpenseEntry';
import { KhataView } from './KhataView';
import { OrdersView } from './OrdersView';
import { CloseDay } from './CloseDay';

type SubView = 'expense' | 'khata' | 'orders' | 'close';

export const MoneyTab: React.FC = () => {
  const role = useUIStore((state) => state.role);
  const [subView, setSubView] = useState<SubView>('expense');

  // A helper records spending and collects khata, but does not close the day.
  const tabs: { id: SubView; label: string }[] =
    role === 'owner'
      ? [
          { id: 'expense', label: 'Expense' },
          { id: 'khata', label: 'Khata' },
          { id: 'orders', label: 'Orders' },
          { id: 'close', label: 'Close' },
        ]
      : [
          { id: 'expense', label: 'Expense' },
          { id: 'khata', label: 'Khata' },
          { id: 'orders', label: 'Orders' },
        ];

  const active: SubView = subView === 'close' && role !== 'owner' ? 'expense' : subView;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubView(t.id)}
            className="tap flex-1 min-h-[44px] rounded-md text-[13px] font-bold border transition-colors"
            style={{
              backgroundColor:
                active === t.id ? 'var(--color-primary)' : 'var(--color-surface)',
              borderColor:
                active === t.id ? 'var(--color-primary)' : 'var(--color-line)',
              color: active === t.id ? 'var(--color-tx-inverse)' : 'var(--color-tx2)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'expense' && <ExpenseEntry />}
      {active === 'khata' && <KhataView />}
      {active === 'orders' && <OrdersView />}
      {active === 'close' && role === 'owner' && <CloseDay />}
    </div>
  );
};
