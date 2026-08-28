import React from 'react';

interface BigNumProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  color?: string;
  autoFocus?: boolean;
}

export const BigNum: React.FC<BigNumProps> = ({
  value,
  onChange,
  placeholder = '0',
  color = 'var(--color-marigold)',
  autoFocus = false,
}) => {
  return (
    <div className="w-full flex items-center justify-center my-2">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ color }}
        className="w-full text-center font-mono text-[34px] leading-tight font-bold bg-transparent border-none border-b-2 border-line focus:border-line-strong focus:outline-none py-2 tracking-tight"
      />
    </div>
  );
};
