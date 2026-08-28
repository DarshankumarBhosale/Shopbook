import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { ExpenseEntry } from './ExpenseEntry';
import { CloseDay } from './CloseDay';

export const MoneyTab: React.FC = () => {
  const role = useUIStore((state) => state.role);
  const [subView, setSubView] = useState<'expense' | 'close'>('expense');

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px]">
      {/* Sub-view navigation for Owner */}
      {role === 'owner' && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSubView('expense')}
            className="tap flex-1 py-2.5 rounded-md text-[13px] font-bold border transition-colors"
            style={{
              backgroundColor:
                subView === 'expense' ? 'var(--color-marigold)' : 'var(--color-surface)',
              borderColor:
                subView === 'expense' ? 'var(--color-marigold)' : 'var(--color-line)',
              color:
                subView === 'expense' ? 'var(--color-tx-inverse)' : 'var(--color-tx2)',
            }}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setSubView('close')}
            className="tap flex-1 py-2.5 rounded-md text-[13px] font-bold border transition-colors"
            style={{
              backgroundColor:
                subView === 'close' ? 'var(--color-marigold)' : 'var(--color-surface)',
              borderColor:
                subView === 'close' ? 'var(--color-marigold)' : 'var(--color-line)',
              color:
                subView === 'close' ? 'var(--color-tx-inverse)' : 'var(--color-tx2)',
            }}
          >
            Close day
          </button>
        </div>
      )}

      {/* View Content */}
      {subView === 'expense' || role !== 'owner' ? <ExpenseEntry /> : <CloseDay />}
    </div>
  );
};
