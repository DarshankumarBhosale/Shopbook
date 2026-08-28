import { useEffect, useState } from 'react';
import { seedDatabaseIfEmpty } from './db/seed';
import { useDayStore } from './store/dayStore';
import { useUIStore } from './store/uiStore';
import { Shell } from './components/layout/Shell';
import { TopBar } from './components/layout/TopBar';
import { TabBar } from './components/layout/TabBar';
import { RoleSelect } from './components/auth/RoleSelect';
import { StartDay } from './components/day/StartDay';
import { SellTab } from './components/sell/SellTab';
import { StockTab } from './components/stock/StockTab';
import { MoneyTab } from './components/money/MoneyTab';
import { ReportsTab } from './components/reports/ReportsTab';
import { MoreTab } from './components/masters/MoreTab';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const { openDay, isLoading: isDayLoading, loadOpenDay } = useDayStore();
  const { role, tab } = useUIStore();

  useEffect(() => {
    async function init() {
      try {
        await seedDatabaseIfEmpty();
        await loadOpenDay();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsDbReady(true);
      }
    }
    init();
  }, [loadOpenDay]);

  if (!isDbReady || isDayLoading) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center">
          <div className="font-display text-[24px] uppercase text-tx2 animate-pulse">
            Loading ShopBook...
          </div>
        </div>
      </Shell>
    );
  }

  // 1. Role selection gate
  if (!role) {
    return (
      <Shell>
        <RoleSelect />
      </Shell>
    );
  }

  // 2. Start day gate (when no open day)
  if (!openDay) {
    return (
      <Shell>
        <TopBar />
        <StartDay />
      </Shell>
    );
  }

  // 3. Main operational day-book interface
  return (
    <Shell>
      <TopBar />
      <main className="flex-1 flex flex-col overflow-y-auto noscroll">
        {tab === 'sell' && <SellTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'money' && <MoneyTab />}
        {tab === 'reports' && role === 'owner' && <ReportsTab />}
        {tab === 'more' && <MoreTab />}
      </main>
      <TabBar />
    </Shell>
  );
}
