import React from 'react';
import { Badge } from './Badge';
import { formatRupees } from '../../lib/format';

interface ItemTileProps {
  id: number;
  name: string;
  pricePaise: number;
  quantity: number;
  onSelect: () => void;
  disabled?: boolean;
}

export const ItemTile: React.FC<ItemTileProps> = ({
  name,
  pricePaise,
  quantity,
  onSelect,
  disabled = false,
}) => {
  const isSelected = quantity > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="tap relative flex flex-col justify-between p-2 rounded-md transition-all text-left border"
      style={{
        minHeight: '78px',
        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-line)',
        color: isSelected ? 'var(--color-base)' : 'var(--color-tx1)',
        opacity: disabled ? 0.38 : 1,
      }}
    >
      <span className="font-display text-[13px] leading-[14px] uppercase line-clamp-2">
        {name}
      </span>
      <span
        className="font-mono text-mono-m mt-1"
        style={{
          color: isSelected ? 'var(--color-base)' : 'var(--color-primary)',
        }}
      >
        {formatRupees(pricePaise)}
      </span>
      {isSelected && <Badge count={quantity} />}
    </button>
  );
};
