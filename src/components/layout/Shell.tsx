import React from 'react';
import { Toast } from '../common/Toast';
import { useUIStore } from '../../store/uiStore';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const toast = useUIStore((state) => state.toast);

  return (
    <div className="min-h-screen bg-base text-tx1 font-body flex justify-center selection:bg-primary selection:text-base">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-base shadow-2xl border-x border-line/30">
        {children}
        <Toast message={toast} />
      </div>
    </div>
  );
};
