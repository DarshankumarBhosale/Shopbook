import React from 'react';
import { ShoppingBag, Package, Banknote, BarChart2, MoreHorizontal } from 'lucide-react';
import { useUIStore, type Tab } from '../../store/uiStore';

export const TabBar: React.FC = () => {
  const { tab, setTab, role, showToast } = useUIStore();

  const handleTabClick = (targetTab: Tab) => {
    if ((targetTab === 'more' || targetTab === 'reports') && role !== 'owner') {
      showToast('Owner only');
      return;
    }
    setTab(targetTab);
  };

  const tabs = [
    { id: 'sell' as const, label: 'Sell', icon: ShoppingBag, available: true },
    { id: 'stock' as const, label: 'Stock', icon: Package, available: true },
    { id: 'money' as const, label: 'Money', icon: Banknote, available: true },
    ...(role === 'owner'
      ? [{ id: 'reports' as const, label: 'Reports', icon: BarChart2, available: true }]
      : []),
    { id: 'more' as const, label: 'More', icon: MoreHorizontal, available: role === 'owner' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[var(--app-width)] bg-surface border-t border-line z-40 flex items-center justify-around h-[62px]">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = tab === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabClick(t.id)}
            className="tap flex-1 flex flex-col items-center justify-center h-full relative pt-1"
            style={{
              borderTop: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-tx3)',
              opacity: t.available ? 1 : 0.45,
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span
              className="font-display text-[10px] tracking-[0.06em] uppercase mt-0.5"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-tx3)',
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
