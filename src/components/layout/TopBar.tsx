import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDayStore } from '../../store/dayStore';
import { formatHeaderDate } from '../../lib/format';

export const TopBar: React.FC = () => {
  const { role, setRole } = useUIStore();
  const { openDay } = useDayStore();
  const dateStr = formatHeaderDate();

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-surface/50 text-[11px] tracking-[0.08em] select-none sticky top-0 z-30 backdrop-blur-xs">
      <span className="text-tx2 uppercase font-medium">{dateStr}</span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: openDay ? 'var(--color-success)' : 'var(--color-tx3)',
            }}
          />
          <span
            className="uppercase font-semibold text-[11px]"
            style={{
              color: openDay ? 'var(--color-success)' : 'var(--color-tx3)',
            }}
          >
            {openDay ? 'Day open' : 'Not started'}
          </span>
        </div>

        {role && (
          <button
            type="button"
            onClick={() => setRole(null)}
            className="tap rounded-sm px-2 py-0.5 uppercase text-[10px] tracking-wider font-semibold border bg-surface border-line text-tx1 hover:border-line-strong active:scale-95 transition-transform"
          >
            {role}
          </button>
        )}
      </div>
    </header>
  );
};
