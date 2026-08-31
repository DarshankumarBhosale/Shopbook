import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../../db/schema';
import { useUIStore } from '../../store/uiStore';
import { useItemStore } from '../../store/itemStore';
import { Label } from '../common/Label';
import { PriceInput } from '../common/PriceInput';
import { formatRupees } from '../../lib/format';
import { parsePriceRupees, suggestOnlinePrice } from '../../lib/pricing';
import { BackupView } from '../backup/BackupView';
import { SyncView } from '../sync/SyncView';

type Section = 'menu' | 'backup' | 'sync';

const ALL_SECTIONS: [Section, string][] = [
  ['menu', 'Menu'],
  ['backup', 'Backup'],
  ['sync', 'Sync'],
];

const SectionSwitch: React.FC<{
  section: Section;
  onChange: (s: Section) => void;
  /** Limits the tabs shown — the helper has no business on the menu. */
  only?: Section[];
}> = ({ section, onChange, only }) => (
  <div className="flex gap-2 mb-3">
    {ALL_SECTIONS.filter(([id]) => !only || only.includes(id)).map(
      ([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className="tap flex-1 min-h-[44px] rounded-md text-[13px] font-bold border transition-colors"
          style={{
            backgroundColor:
              section === id ? 'var(--color-primary)' : 'var(--color-surface)',
            borderColor: section === id ? 'var(--color-primary)' : 'var(--color-line)',
            color: section === id ? 'var(--color-tx-inverse)' : 'var(--color-tx2)',
          }}
        >
          {label}
        </button>
      )
    )}
  </div>
);

export const MoreTab: React.FC = () => {
  const role = useUIStore((state) => state.role);
  const showToast = useUIStore((state) => state.showToast);
  const { setCounterPrice, setOnlinePrice, setActive, swapSortOrder, addItem, setArchived } =
    useItemStore();

  const items = useLiveQuery(() => db.items.toArray(), []) || [];

  const sortedItems = React.useMemo(() => {
    return [...items]
      .filter((i) => !i.isArchived)
      .sort((a, b) => (a.sortOrder ?? a.id ?? 0) - (b.sortOrder ?? b.id ?? 0));
  }, [items]);

  const removedItems = React.useMemo(
    () => items.filter((i) => i.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const activeCount = sortedItems.filter((i) => i.isActive).length;

  const [section, setSection] = useState<Section>('menu');
  const [helperSection, setHelperSection] = useState<Section>('backup');
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: 'Packaged', price: '', cost: '' });
  const [isSaving, setIsSaving] = useState(false);

  // A helper reaches Backup and Sync but not the menu — they may be the one
  // holding the till, and their own phone still has to connect itself.
  if (role !== 'owner') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3">
          <SectionSwitch
            section={helperSection}
            onChange={setHelperSection}
            only={['backup', 'sync']}
          />
        </div>
        {helperSection === 'sync' ? <SyncView /> : <BackupView />}
      </div>
    );
  }

  if (section === 'backup' || section === 'sync') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-3">
          <SectionSwitch section={section} onChange={setSection} />
        </div>
        {section === 'sync' ? <SyncView /> : <BackupView />}
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

  const handleAdd = async () => {
    const counterPaise = parsePriceRupees(draft.price);
    if (draft.name.trim() === '' || counterPaise === null) return;

    const costPaise = draft.cost.trim() === '' ? undefined : parsePriceRupees(draft.cost);
    if (draft.cost.trim() !== '' && costPaise === null) {
      showToast('Cost must be a whole rupee amount');
      return;
    }

    try {
      setIsSaving(true);
      await addItem({
        name: draft.name,
        category: draft.category,
        counterPaise,
        onlinePaise: suggestOnlinePrice(counterPaise),
        costPaise: costPaise ?? undefined,
        role,
      });
      showToast(`${draft.name.trim()} added`);
      setDraft({ name: '', category: draft.category, price: '', cost: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to add item:', err);
      showToast(err instanceof Error ? err.message : 'Could not add that item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (itemId: number, archived: boolean, name: string) => {
    try {
      await setArchived(itemId, archived, role);
      showToast(archived ? `${name} removed` : `${name} put back`);
    } catch (err) {
      console.error('Failed to change item:', err);
      showToast('Could not change that item');
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
      <SectionSwitch section={section} onChange={setSection} />

      <div className="mb-4">
        <Label>Menu &amp; prices</Label>
        <p className="text-body-s text-tx2 mt-1">
          Change a price and it applies to the next sale. Turn an item off to take it
          off the Sell board without losing its history.
        </p>
        <p className="text-body-s text-tx3 mt-1 font-mono">
          {activeCount} on the board · {sortedItems.length - activeCount} off
          {removedItems.length > 0 && ` · ${removedItems.length} removed`}
        </p>
      </div>

      {/* Add a new item */}
      {isAdding ? (
        <div className="bg-surface border border-line-strong rounded-md p-4 mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[16px] tracking-[0.04em] uppercase text-tx1">
              New item
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="tap text-body-s text-tx3 px-2 min-h-[44px]"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name, e.g. Good Day"
            aria-label="New item name"
            className="min-h-[44px] rounded-sm px-3 text-body-m bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {['Packaged', 'Breakfast', 'Main Course', 'Beverage'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft({ ...draft, category: c })}
                className="tap min-h-[44px] rounded-full px-3 text-body-s font-semibold border"
                style={{
                  backgroundColor:
                    draft.category === c ? 'var(--color-primary)' : 'var(--color-base)',
                  borderColor:
                    draft.category === c ? 'var(--color-primary)' : 'var(--color-line)',
                  color:
                    draft.category === c ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>
                Sell price ₹
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, '') })}
                aria-label="New item sell price"
                className="min-h-[44px] rounded-sm px-3 font-mono text-body-m bg-base border border-line text-tx1 focus:border-line-strong focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>
                Cost price ₹
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={draft.cost}
                onChange={(e) => setDraft({ ...draft, cost: e.target.value.replace(/\D/g, '') })}
                aria-label="New item cost price"
                className="min-h-[44px] rounded-sm px-3 font-mono text-body-m bg-base border border-line text-tx1 focus:border-line-strong focus:outline-none"
              />
            </label>
          </div>

          <p className="text-body-s text-tx3">
            Give a cost price for something you buy ready-made and sell as-is — it
            gets its own stock line and comes off the shelf on every sale. Leave it
            blank for something cooked; its recipe has to be set up separately.
          </p>

          <button
            type="button"
            onClick={handleAdd}
            disabled={draft.name.trim() === '' || draft.price === '' || isSaving}
            className="tap min-h-[48px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase disabled:opacity-40"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-tx-on-accent)',
            }}
          >
            {isSaving ? 'Saving…' : 'Add to menu'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="tap min-h-[48px] mb-4 rounded-md border border-line-strong bg-surface text-body-m font-semibold text-tx1"
        >
          + Add an item
        </button>
      )}

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

            <button
              type="button"
              onClick={() => handleArchive(item.id!, true, item.name)}
              className="tap self-start min-h-[44px] text-body-s font-semibold"
              style={{ color: 'var(--color-danger-text)' }}
            >
              Remove from menu
            </button>
          </div>
        ))}
      </div>

      {/* Removed items — kept so past sales still resolve */}
      {removedItems.length > 0 && (
        <div className="mt-6">
          <Label>Removed</Label>
          <p className="text-body-s text-tx2 mt-1 mb-2">
            Off the menu, but every sale they appear in is still intact. Put one
            back any time.
          </p>
          <div className="flex flex-col gap-2">
            {removedItems.map((item) => (
              <div
                key={item.id}
                className="bg-surface border border-line rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-body-m text-tx2 truncate">{item.name}</div>
                  <div className="text-body-s text-tx3">
                    {item.category} · {formatRupees(item.sellPriceCounter)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleArchive(item.id!, false, item.name)}
                  className="tap min-h-[44px] px-3 rounded-sm border border-line-strong bg-base text-body-s font-semibold text-tx1 shrink-0"
                >
                  Put back
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
