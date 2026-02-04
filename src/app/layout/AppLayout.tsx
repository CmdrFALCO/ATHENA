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
import { MergeCandidatesPanel, useSimilarityPanel } from '@/modules/similarity';
import { SynthesisPanel } from '@/modules/synthesis';
import { ViewResultsPanel } from '@/modules/views';
import { AXIOMPanel, InterventionModal } from '@/modules/axiom/components';
import { useAXIOMPanel } from '@/modules/axiom/hooks';
import { CommunityPanel } from '@/modules/community/components/CommunityPanel';
import { useCommunityPanel } from '@/modules/community/hooks/useCommunityPanel';

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

  // WP 8.1: Similarity / Merge Candidates Panel state (Ctrl+Shift+M)
  const { isOpen: isSimilarityPanelOpen, close: closeSimilarityPanel } = useSimilarityPanel();

  // WP 9A.3: AXIOM Panel state (Ctrl+Shift+A)
  useAXIOMPanel();

  // WP 9B.7: Community Panel state (Ctrl+Shift+G)
  const { isOpen: isCommunityPanelOpen, close: closeCommunityPanel } = useCommunityPanel();

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

      {/* Merge Candidates Panel - entity resolution (WP 8.1) - Ctrl+Shift+M */}
      <MergeCandidatesPanel isOpen={isSimilarityPanelOpen} onClose={closeSimilarityPanel} />

      {/* Synthesis Panel - knowledge synthesis (WP 8.7) */}
      <SynthesisPanel />

      {/* View Results Panel - smart views slide-over (WP 8.9) */}
      <ViewResultsPanel />

      {/* Chat Panel - slide-over chat interface (WP 7.1) - Ctrl+Shift+C */}
      <ChatPanel />
      <ChatToggleButton />

      {/* AXIOM Panel - workflow visualization (WP 9A.3) - Ctrl+Shift+A */}
      <AXIOMPanel />
      <InterventionModal />

      {/* Community Panel - community detection (WP 9B.7) - Ctrl+Shift+G */}
      <CommunityPanel isOpen={isCommunityPanelOpen} onClose={closeCommunityPanel} />
    </div>
  );
}
