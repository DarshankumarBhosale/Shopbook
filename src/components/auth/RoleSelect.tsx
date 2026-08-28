import React from 'react';
import { useUIStore, type Role } from '../../store/uiStore';

export const RoleSelect: React.FC = () => {
  const setRole = useUIStore((state) => state.setRole);

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 text-center select-none">
      <div className="mb-2">
        <h1 className="font-display text-[48px] leading-[0.95] tracking-[0.02em] uppercase text-tx1">
          SHOP<br />
          <span style={{ color: 'var(--color-marigold)' }}>BOOK</span>
        </h1>
      </div>

      <p className="text-tx2 text-body-m mt-4 mb-10">
        Who's on the counter?
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => handleSelectRole('owner')}
          className="tap w-full h-[52px] rounded-md font-display text-[20px] tracking-[0.06em] uppercase flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{
            backgroundColor: 'var(--color-marigold)',
            color: 'var(--color-tx-inverse)',
          }}
        >
          OWNER
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('helper')}
          className="tap w-full h-[52px] rounded-md font-display text-[20px] tracking-[0.06em] uppercase flex items-center justify-center border transition-transform active:scale-[0.97]"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-tx1)',
          }}
        >
          HELPER
        </button>
      </div>

      <p className="text-tx3 text-body-s mt-10 max-w-xs mx-auto">
        Helper can record sales, expenses and stock. Profit and edits stay with the owner.
      </p>
    </div>
  );
};
