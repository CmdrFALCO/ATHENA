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
  // Resources (WP 6.2)
  useResources,
  useResource,
  useResourcesLoading,
  useSelectedResourceId,
  useUploadProgress,
  useIsResourceSelected, // WP 6.3
  resourceActions,
  setResourceAdapter,
  loadResources,
  uploadResource,
  addUrlResource,
  updateResource,
  deleteResource,
  getResourceBlob,
  selectResource,
} from './hooks';

// Resource state (WP 6.2)
export { resourceState$ } from './resourceState';
export type { ResourceState } from './resourceState';

// Initialization
export { useInitializeStore } from './useInitializeStore';
