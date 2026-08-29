import React, { useState } from 'react';
import { parsePriceRupees } from '../../lib/pricing';
import { toRupees } from '../../lib/format';

interface PriceInputProps {
  valuePaise: number;
  onCommit: (pricePaise: number) => void;
  label: string;
  ariaLabel: string;
}

/**
 * An inline rupee field for the item master.
 *
 * The draft is held locally and only written on blur or Enter — committing on
 * every keystroke would save ₹3 on the way to typing ₹35, and every sale rung
 * up in between would take the wrong price. An invalid or empty entry reverts
 * to the stored value instead of being written.
 */
export const PriceInput: React.FC<PriceInputProps> = ({
  valuePaise,
  onCommit,
  label,
  ariaLabel,
}) => {
  const [draft, setDraft] = useState(String(toRupees(valuePaise)));
  const [isEditing, setIsEditing] = useState(false);
  const [lastSeenPaise, setLastSeenPaise] = useState(valuePaise);

  // Follow the stored value when it changes underneath us — but never while
  // this field is being typed into, or the owner's keystrokes get overwritten.
  // Adjusted during render rather than in an effect, so the stale value is
  // never painted first.
  if (valuePaise !== lastSeenPaise && !isEditing) {
    setLastSeenPaise(valuePaise);
    setDraft(String(toRupees(valuePaise)));
  }

  const commit = () => {
    setIsEditing(false);
    const parsed = parsePriceRupees(draft);
    if (parsed === null) {
      setDraft(String(toRupees(valuePaise)));
      return;
    }
    setLastSeenPaise(parsed);
    if (parsed !== valuePaise) {
      onCommit(parsed);
    }
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>
        {label}
      </span>
      <span className="flex items-center gap-1 rounded-sm border border-line bg-base px-2 focus-within:border-line-strong">
        <span className="font-mono text-body-m text-tx3">₹</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={ariaLabel}
          value={draft}
          onFocus={() => setIsEditing(true)}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setDraft(String(toRupees(valuePaise)));
              setIsEditing(false);
              e.currentTarget.blur();
            }
          }}
          className="w-full min-h-[44px] bg-transparent font-mono text-mono-m text-marigold focus:outline-none"
        />
      </span>
    </label>
  );
};
