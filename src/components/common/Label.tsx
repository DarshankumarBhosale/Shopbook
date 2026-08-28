import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`text-label text-tx3 uppercase tracking-wider mb-1 ${className}`}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </div>
  );
};
