// Core state
export { appState$ } from './state';
export type { UIState } from './state';

// Hooks
export {
  useSidebarOpen,
  useDevSettingsOpen,
  useSelectedEntityIds,
  useNotes,
  useNote,
  useNotesLoading,
  useConnections,
  useConnectionsFor,
  useFeatureFlag,
  useDevSettings,
  uiActions,
  entityActions,
  connectionActions,
} from './hooks';

// Initialization
export { useInitializeStore } from './useInitializeStore';
