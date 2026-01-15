import { useCallback } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StoreInitializer } from './StoreInitializer';
import { DevSettingsPanel } from '@/config';
import { useIdleDetection, useOptionalIndexer } from '@/modules/ai';

/**
 * Hook to connect idle detection with the background indexer.
 * Pauses indexing when user is active, resumes when idle.
 */
function useIndexerIdleDetection() {
  const indexer = useOptionalIndexer();

  const onIdle = useCallback(() => {
    indexer?.resume();
  }, [indexer]);

  const onActive = useCallback(() => {
    indexer?.pause();
  }, [indexer]);

  useIdleDetection({
    idleThresholdMs: 3000,
    onIdle,
    onActive,
  });
}

export function AppLayout() {
  // Connect idle detection with background indexer
  useIndexerIdleDetection();

  return (
    <div className="h-screen flex flex-col bg-athena-bg text-athena-text">
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 bg-athena-bg overflow-hidden">
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
