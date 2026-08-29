import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../../db/schema';
import { useUIStore } from '../../store/uiStore';
import { useItemStore } from '../../store/itemStore';
import { Label } from '../common/Label';
import { PriceInput } from '../common/PriceInput';
import { formatRupees } from '../../lib/format';

export const MoreTab: React.FC = () => {
  const role = useUIStore((state) => state.role);
  const showToast = useUIStore((state) => state.showToast);
  const { setCounterPrice, setOnlinePrice, setActive, swapSortOrder } = useItemStore();

  const items = useLiveQuery(() => db.items.toArray(), []) || [];

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => (a.sortOrder ?? a.id ?? 0) - (b.sortOrder ?? b.id ?? 0));
  }, [items]);

  const activeCount = sortedItems.filter((i) => i.isActive).length;

  if (role !== 'owner') {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <p className="text-body-m text-tx3 text-center">
          Menu and prices are owner-only.
        </p>
      </div>
    );
  }

  const handlePrice = async (
    action: (id: number, paise: number, r: typeof role) => Promise<void>,
    itemId: number,
    paise: number,
    name: string
  ) => {
    try {
      await action(itemId, paise, role);
      showToast(`${name} · ${formatRupees(paise)}`);
    } catch (err) {
      console.error('Failed to update price:', err);
      showToast('Could not save that price');
    }
  };

  const handleToggle = async (itemId: number, next: boolean, name: string) => {
    try {
      await setActive(itemId, next, role);
      showToast(next ? `${name} back on the board` : `${name} taken off the board`);
    } catch (err) {
      console.error('Failed to change availability:', err);
      showToast('Could not change availability');
    }
  };

  const handleMove = async (index: number, delta: number) => {
    const a = sortedItems[index];
    const b = sortedItems[index + delta];
    if (!a || !b) return;
    try {
      await swapSortOrder(a, b, role);
      showToast(`Moved ${a.name}`);
    } catch (err) {
      console.error('Failed to move item:', err);
      showToast('Could not move that tile');
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      <div className="mb-4">
        <Label>Menu &amp; prices</Label>
        <p className="text-body-s text-tx2 mt-1">
          Change a price and it applies to the next sale. Turn an item off to take it
          off the Sell board without losing its history.
        </p>
        <p className="text-body-s text-tx3 mt-1 font-mono">
          {activeCount} on the board · {sortedItems.length - activeCount} off
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {sortedItems.map((item, index) => (
          <div
            key={item.id}
            className="bg-surface border border-line rounded-md p-3 flex flex-col gap-3"
            style={{ opacity: item.isActive ? 1 : 0.55 }}
          >
            {/* Name, position and reordering */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-[15px] tracking-[0.04em] uppercase text-tx1 truncate">
                  {item.name}
                </div>
                <div className="text-body-s text-tx3">
                  #{item.sortOrder ?? index + 1} · {item.category}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.name} up`}
                  className="tap w-11 h-11 rounded-sm bg-base border border-line flex items-center justify-center text-tx2 hover:text-tx1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === sortedItems.length - 1}
                  aria-label={`Move ${item.name} down`}
                  className="tap w-11 h-11 rounded-sm bg-base border border-line flex items-center justify-center text-tx2 hover:text-tx1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={18} />
                </button>
              </div>
            </div>

            {/* Prices and availability */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <PriceInput
                label="Counter"
                ariaLabel={`${item.name} counter price`}
                valuePaise={item.sellPriceCounter}
                onCommit={(paise) =>
                  handlePrice(setCounterPrice, item.id!, paise, item.name)
                }
              />
              <PriceInput
                label="Online"
                ariaLabel={`${item.name} online price`}
                valuePaise={item.sellPriceOnline}
                onCommit={(paise) =>
                  handlePrice(setOnlinePrice, item.id!, paise, item.name)
                }
              />
              <button
                type="button"
                onClick={() => handleToggle(item.id!, !item.isActive, item.name)}
                aria-pressed={item.isActive}
                aria-label={`${item.name} availability`}
                className="tap min-h-[44px] px-3 rounded-sm border font-display text-[13px] tracking-[0.06em] uppercase"
                style={{
                  borderColor: item.isActive
                    ? 'var(--color-success)'
                    : 'var(--color-line-strong)',
                  color: item.isActive ? 'var(--color-success)' : 'var(--color-tx3)',
                  backgroundColor: 'var(--color-base)',
                }}
              >
                {item.isActive ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
