import { useCallback } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StoreInitializer } from './StoreInitializer';
import { DevSettingsPanel } from '@/config';
import { useIdleDetection, useOptionalIndexer } from '@/modules/ai';
import { CommandPalette, SearchPanel, useSearchPanel } from '@/modules/search';
import { ValidationPanel, useValidationPanel } from '@/modules/validation';
import { ChatPanel, ChatToggleButton } from '@/modules/chat';

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

  // WP 4.6: Search Panel state
  const { isOpen: isSearchPanelOpen, open: openSearchPanel, close: closeSearchPanel } = useSearchPanel();

  // WP 5.6: Validation Panel state (Ctrl+Shift+V)
  const { isOpen: isValidationPanelOpen, close: closeValidationPanel } = useValidationPanel();

  return (
    <div className="h-screen flex flex-col bg-athena-bg text-athena-text">
      <Header onSearchClick={openSearchPanel} />

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

      {/* Command Palette - quick jump overlay (WP 4.1) - Cmd+K */}
      <CommandPalette />

      {/* Search Panel - faceted search overlay (WP 4.6) - Cmd+Shift+K */}
      <SearchPanel isOpen={isSearchPanelOpen} onClose={closeSearchPanel} />

      {/* Validation Panel - validation violations overlay (WP 5.6) - Ctrl+Shift+V */}
      <ValidationPanel isOpen={isValidationPanelOpen} onClose={closeValidationPanel} />

      {/* Chat Panel - slide-over chat interface (WP 7.1) - Ctrl+Shift+C */}
      <ChatPanel />
      <ChatToggleButton />
    </div>
  );
}
