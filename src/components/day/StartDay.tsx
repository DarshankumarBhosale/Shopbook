import React, { useState } from 'react';
import { BigNum } from '../common/BigNum';
import { Label } from '../common/Label';
import { useDayStore } from '../../store/dayStore';
import { useUIStore } from '../../store/uiStore';

export const StartDay: React.FC = () => {
  const [openingCash, setOpeningCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openNewDay = useDayStore((state) => state.openNewDay);
  const showToast = useUIStore((state) => state.showToast);

  const handleOpenDay = async () => {
    try {
      setIsSubmitting(true);
      await openNewDay(openingCash || 0);
      showToast('Day book opened');
    } catch (err) {
      console.error(err);
      showToast('Failed to open day');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 text-center select-none">
      <h1 className="font-display text-display-l uppercase text-tx1">
        Start the day
      </h1>
      <p className="text-tx2 text-body-m mt-3 mb-8 max-w-xs mx-auto">
        Count the drawer before the first customer. Tonight's close checks against this.
      </p>

      <div className="w-full max-w-xs mx-auto mb-6">
        <Label>Opening cash (₹)</Label>
        <BigNum
          value={openingCash}
          onChange={setOpeningCash}
          placeholder="0"
          autoFocus
        />
      </div>

      <div className="w-full max-w-xs mx-auto mt-4">
        <button
          type="button"
          onClick={handleOpenDay}
          disabled={isSubmitting}
          className="tap w-full h-[52px] rounded-md font-display text-[20px] tracking-[0.06em] uppercase flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{
            backgroundColor: 'var(--color-marigold)',
            color: 'var(--color-tx-inverse)',
          }}
        >
          {isSubmitting ? 'OPENING...' : 'OPEN DAY BOOK'}
        </button>
      </div>
    </div>
  );
};
