import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../../db/schema';
import { useUIStore } from '../../store/uiStore';
import { Label } from '../common/Label';
import { formatRupees } from '../../lib/format';

export const MoreTab: React.FC = () => {
  const showToast = useUIStore((state) => state.showToast);
  const items = useLiveQuery(() => db.items.toArray(), []) || [];

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => (a.sortOrder ?? a.id ?? 0) - (b.sortOrder ?? b.id ?? 0));
  }, [items]);

  const updateSortOrder = async (itemId: number, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) return;
    try {
      await db.items.update(itemId, { sortOrder: newOrder });
      showToast('Tile position updated');
    } catch (err) {
      console.error(err);
      showToast('Failed to update position');
    }
  };

  const swapOrder = async (indexA: number, indexB: number) => {
    if (indexA < 0 || indexB < 0 || indexA >= sortedItems.length || indexB >= sortedItems.length) return;
    const itemA = sortedItems[indexA];
    const itemB = sortedItems[indexB];
    if (!itemA.id || !itemB.id) return;

    const orderA = itemA.sortOrder ?? (indexA + 1);
    const orderB = itemB.sortOrder ?? (indexB + 1);

    try {
      await db.transaction('rw', db.items, async () => {
        await db.items.update(itemA.id!, { sortOrder: orderB });
        await db.items.update(itemB.id!, { sortOrder: orderA });
      });
      showToast(`Moved ${itemA.name}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to move item');
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      <div className="mb-3">
        <Label>Menu & Tile Board Position</Label>
        <p className="text-body-s text-tx2 mt-1">
          Adjust the tile order below. Position #1 appears first in the top-left of the 3-column board.
        </p>
      </div>

      <div className="space-y-2">
        {sortedItems.map((item, index) => (
          <div
            key={item.id}
            className="bg-surface border border-line rounded-md p-3 flex items-center justify-between gap-3"
          >
            {/* Position & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-body-s font-bold text-marigold w-6 text-center shrink-0">
                #{item.sortOrder ?? (index + 1)}
              </span>
              <div className="min-w-0">
                <div className="font-display text-[15px] tracking-[0.04em] uppercase text-tx1 truncate">
                  {item.name}
                </div>
                <div className="text-body-s text-tx3">
                  {formatRupees(item.sellPriceCounter)} · {item.category}
                </div>
              </div>
            </div>

            {/* Quick Up/Down Controls & Manual Position Input */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => swapOrder(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${item.name} up`}
                className="tap w-8 h-8 rounded bg-base border border-line flex items-center justify-center text-tx2 hover:text-tx1 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} />
              </button>

              <button
                type="button"
                onClick={() => swapOrder(index, index + 1)}
                disabled={index === sortedItems.length - 1}
                aria-label={`Move ${item.name} down`}
                className="tap w-8 h-8 rounded bg-base border border-line flex items-center justify-center text-tx2 hover:text-tx1 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown size={16} />
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={item.sortOrder ?? (index + 1)}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                  if (item.id && !isNaN(val)) updateSortOrder(item.id, val);
                }}
                className="w-10 h-8 text-center font-mono text-body-m font-bold bg-base border border-line rounded text-tx1 focus:border-line-strong focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
