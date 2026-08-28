import { create } from 'zustand';

export type Role = 'owner' | 'helper';
export type Tab = 'sell' | 'stock' | 'money' | 'reports' | 'more';

interface UIState {
  role: Role | null;
  tab: Tab;
  toast: string | null;
  toastTimer: ReturnType<typeof setTimeout> | null;
  setRole: (role: Role | null) => void;
  setTab: (tab: Tab) => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  role: null,
  tab: 'sell',
  toast: null,
  toastTimer: null,
  setRole: (role) => set({ role }),
  setTab: (tab) => set({ tab }),
  showToast: (msg) => {
    const prevTimer = get().toastTimer;
    if (prevTimer) clearTimeout(prevTimer);

    const timer = setTimeout(() => {
      set({ toast: null, toastTimer: null });
    }, 2200);

    set({ toast: msg, toastTimer: timer });
  },
}));
