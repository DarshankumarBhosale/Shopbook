import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%_-_32px)] max-w-[calc(28rem_-_32px)] rounded-md px-4 py-3 text-center font-bold text-body-s z-50 pointer-events-none transition-all animate-bounce"
      style={{
        bottom: '88px',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-tx-inverse)',
      }}
    >
      {message}
    </div>
  );
};
