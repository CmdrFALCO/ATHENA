import { Outlet } from '@tanstack/react-router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StoreInitializer } from './StoreInitializer';
import { DevSettingsPanel } from '@/config';

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-athena-bg text-athena-text">
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 bg-athena-bg overflow-auto">
          <StoreInitializer>
            <Outlet />
          </StoreInitializer>
        </main>
      </div>

      {/* DevSettings Modal - continues to work as overlay */}
      <DevSettingsPanel />
    </div>
  );
}
