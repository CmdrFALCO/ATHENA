import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';
import { configureObservablePersistence } from '@legendapp/state/persist';
import type { Note, Connection, Cluster } from '@/shared/types';

// Configure persistence plugin
configureObservablePersistence({
  pluginLocal: ObservablePersistLocalStorage,
});

// UI State
export interface UIState {
  sidebarOpen: boolean;
  activePanelId: string | null;
  selectedEntityIds: string[];
  devSettingsOpen: boolean;
}

// App State (persisted to localStorage for UI, synced from SQLite for data)
export const appState$ = observable({
  // UI state (persisted to localStorage)
  ui: {
    sidebarOpen: true,
    activePanelId: null as string | null,
    selectedEntityIds: [] as string[],
    devSettingsOpen: false,
  } as UIState,

  // Entity cache (loaded from SQLite on init)
  entities: {
    notes: {} as Record<string, Note>,
    isLoading: false,
    lastSync: null as string | null,
  },

  // Connection cache (loaded from SQLite on init)
  connections: {
    items: {} as Record<string, Connection>,
    isLoading: false,
    lastSync: null as string | null,
  },

  // Cluster cache (loaded from SQLite on init)
  clusters: {
    items: {} as Record<string, Cluster>,
    isLoading: false,
    lastSync: null as string | null,
  },

  // Initialization status
  initialized: false,
});

// Persist UI state only (entities come from SQLite)
persistObservable(appState$.ui, {
  local: 'athena-ui-state',
});

// Export for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_STATE__: typeof appState$ }).__ATHENA_STATE__ = appState$;
}
