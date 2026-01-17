// Core state
export { appState$ } from './state';
export type { UIState, SuggestedConnection, SuggestionsState } from './state';

// Hooks
export {
  useSidebarOpen,
  useDevSettingsOpen,
  useSelectedEntityIds,
  useCommandPaletteOpen,  // WP 4.1
  useNotes,
  useNote,
  useNotesLoading,
  useConnections,
  useConnectionsFor,
  useClusters,
  useCluster,
  useClustersForEntity,
  useClustersLoading,
  useFeatureFlag,
  useCanvasConfig,
  useDevSettings,
  uiActions,
  entityActions,
  connectionActions,
  clusterActions,
  // Suggestions (WP 3.5)
  useSuggestedConnections,
  usePendingSuggestions,
  useSuggestionsGenerating,
  useSuggestionsSourceNote,
  suggestionActions,
  // Indexer events (WP 3.5)
  useLastIndexedNoteId,
  indexerActions,
} from './hooks';

// Initialization
export { useInitializeStore } from './useInitializeStore';
