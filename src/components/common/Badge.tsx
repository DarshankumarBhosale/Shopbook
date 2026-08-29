import React from 'react';

interface BadgeProps {
  count: number;
}

export const Badge: React.FC<BadgeProps> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[12px] font-bold z-10"
      style={{
        background: 'var(--color-base)',
        color: 'var(--color-primary)',
        border: '2px solid var(--color-primary)',
      }}
    >
      {count}
    </span>
  );
};
