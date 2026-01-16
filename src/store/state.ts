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
  commandPaletteOpen: boolean;  // WP 4.1: Command palette visibility
}

// Suggested Connection (WP 3.5 - Green Connections)
export interface SuggestedConnection {
  id: string;                    // Temporary ID (not persisted to DB)
  sourceId: string;              // Entity ID
  targetId: string;              // Entity ID
  similarity: number;            // 0-1 confidence score
  generatedAt: string;           // ISO timestamp
  status: 'pending' | 'dismissed';
}

// Suggestions State
export interface SuggestionsState {
  connections: SuggestedConnection[];
  isGenerating: boolean;
  lastGeneratedAt: string | null;
  sourceNoteId: string | null;   // The note we generated suggestions for
}

// App State (persisted to localStorage for UI, synced from SQLite for data)
export const appState$ = observable({
  // UI state (persisted to localStorage)
  ui: {
    sidebarOpen: true,
    activePanelId: null as string | null,
    selectedEntityIds: [] as string[],
    devSettingsOpen: false,
    commandPaletteOpen: false,
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

  // AI Suggestions (WP 3.5 - Green Connections)
  // Note: NOT persisted - suggestions are ephemeral
  suggestions: {
    connections: [] as SuggestedConnection[],
    isGenerating: false,
    lastGeneratedAt: null as string | null,
    sourceNoteId: null as string | null,
  } as SuggestionsState,

  // Indexer events (WP 3.5 - used to broadcast note indexed events globally)
  indexer: {
    lastIndexedNoteId: null as string | null,
    lastIndexedAt: null as string | null,
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
