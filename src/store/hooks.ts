import { useSelector } from '@legendapp/state/react';
import { appState$, type SuggestedConnection } from './state';
import { devSettings$, type FeatureFlags, type CanvasConfig } from '@/config';
import type { Note, Connection, Cluster } from '@/shared/types';
import { getCommunityDetectionService } from '@/modules/community/CommunityDetectionService';

// WP 9B.7: Lightweight community invalidation helper
function notifyCommunityInvalidation(reason: 'entity_change' | 'connection_change'): void {
  const service = getCommunityDetectionService();
  if (service) {
    service.invalidate(reason).catch((err) => {
      console.warn('[CommunityInvalidation]', err);
    });
  }
}

// UI State hooks
export function useSidebarOpen(): boolean {
  return useSelector(() => appState$.ui.sidebarOpen.get());
}

export function useDevSettingsOpen(): boolean {
  return useSelector(() => appState$.ui.devSettingsOpen.get());
}

export function useSelectedEntityIds(): string[] {
  return useSelector(() => appState$.ui.selectedEntityIds.get());
}

// WP 8.7.1: Multi-resource selection for synthesis
export function useSelectedResourceIds(): string[] {
  return useSelector(() => appState$.ui.selectedResourceIds.get());
}

// WP 4.1: Command palette
export function useCommandPaletteOpen(): boolean {
  return useSelector(() => appState$.ui.commandPaletteOpen.get());
}

// Entity hooks
export function useNotes(): Note[] {
  return useSelector(() => Object.values(appState$.entities.notes.get()));
}

export function useNote(id: string): Note | undefined {
  return useSelector(() => {
    const notes = appState$.entities.notes.get();
    return notes[id];
  });
}

export function useNotesLoading(): boolean {
  return useSelector(() => appState$.entities.isLoading.get());
}

// Connection hooks
export function useConnections(): Connection[] {
  return useSelector(() => Object.values(appState$.connections.items.get()));
}

export function useConnectionsFor(entityId: string): Connection[] {
  return useSelector(() => {
    const all = appState$.connections.items.get();
    return Object.values(all).filter(
      (c) => c.source_id === entityId || c.target_id === entityId
    );
  });
}

// Feature flag hooks
export function useFeatureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  return useSelector(() => devSettings$.flags[flag].get()) as FeatureFlags[K];
}

// Canvas config hooks
export function useCanvasConfig<K extends keyof CanvasConfig>(key: K): CanvasConfig[K] {
  return useSelector(() => devSettings$.canvas[key].get()) as CanvasConfig[K];
}

export function useDevSettings() {
  return useSelector(() => devSettings$.get());
}

// Actions
export const uiActions = {
  toggleSidebar() {
    appState$.ui.sidebarOpen.set((v) => !v);
  },

  toggleDevSettings() {
    appState$.ui.devSettingsOpen.set((v) => !v);
  },

  openDevSettings() {
    appState$.ui.devSettingsOpen.set(true);
  },

  closeDevSettings() {
    appState$.ui.devSettingsOpen.set(false);
  },

  selectEntity(id: string) {
    appState$.ui.selectedEntityIds.set([id]);
  },

  selectEntities(ids: string[]) {
    appState$.ui.selectedEntityIds.set(ids);
  },

  clearSelection() {
    appState$.ui.selectedEntityIds.set([]);
    appState$.ui.selectedResourceIds.set([]);
  },

  toggleEntitySelection(id: string) {
    const current = appState$.ui.selectedEntityIds.get();
    if (current.includes(id)) {
      appState$.ui.selectedEntityIds.set(current.filter((i) => i !== id));
    } else {
      appState$.ui.selectedEntityIds.set([...current, id]);
    }
  },

  // WP 8.7.1: Multi-resource selection for synthesis
  toggleResourceSelection(id: string) {
    const current = appState$.ui.selectedResourceIds.get();
    if (current.includes(id)) {
      appState$.ui.selectedResourceIds.set(current.filter((i) => i !== id));
    } else {
      appState$.ui.selectedResourceIds.set([...current, id]);
    }
  },

  clearResourceSelection() {
    appState$.ui.selectedResourceIds.set([]);
  },

  // WP 4.1: Command palette
  openCommandPalette() {
    appState$.ui.commandPaletteOpen.set(true);
  },

  closeCommandPalette() {
    appState$.ui.commandPaletteOpen.set(false);
  },

  toggleCommandPalette() {
    appState$.ui.commandPaletteOpen.set((v) => !v);
  },
};

// Entity actions (sync with adapters)
export const entityActions = {
  setNotes(notes: Note[]) {
    const map: Record<string, Note> = {};
    for (const note of notes) {
      map[note.id] = note;
    }
    appState$.entities.notes.set(map);
    appState$.entities.lastSync.set(new Date().toISOString());
  },

  addNote(note: Note) {
    const notes = appState$.entities.notes.get();
    appState$.entities.notes.set({ ...notes, [note.id]: note });
    notifyCommunityInvalidation('entity_change');
  },

  updateNote(id: string, updates: Partial<Note>) {
    const notes = appState$.entities.notes.get();
    const current = notes[id];
    if (current) {
      appState$.entities.notes.set({ ...notes, [id]: { ...current, ...updates } });
    }
  },

  removeNote(id: string) {
    const newNotes = { ...appState$.entities.notes.get() };
    delete newNotes[id];
    appState$.entities.notes.set(newNotes);
    notifyCommunityInvalidation('entity_change');
  },

  setLoading(loading: boolean) {
    appState$.entities.isLoading.set(loading);
  },
};

export const connectionActions = {
  setConnections(connections: Connection[]) {
    const map: Record<string, Connection> = {};
    for (const conn of connections) {
      map[conn.id] = conn;
    }
    appState$.connections.items.set(map);
    appState$.connections.lastSync.set(new Date().toISOString());
  },

  addConnection(connection: Connection) {
    const items = appState$.connections.items.get();
    appState$.connections.items.set({ ...items, [connection.id]: connection });
    notifyCommunityInvalidation('connection_change');
  },

  updateConnection(id: string, updates: Partial<Connection>) {
    const items = appState$.connections.items.get();
    const current = items[id];
    if (current) {
      appState$.connections.items.set({ ...items, [id]: { ...current, ...updates } });
    }
  },

  removeConnection(id: string) {
    const newItems = { ...appState$.connections.items.get() };
    delete newItems[id];
    appState$.connections.items.set(newItems);
    notifyCommunityInvalidation('connection_change');
  },
};

// Cluster hooks
export function useClusters(): Cluster[] {
  return useSelector(() => Object.values(appState$.clusters.items.get()));
}

export function useCluster(id: string): Cluster | undefined {
  return useSelector(() => {
    const clusters = appState$.clusters.items.get();
    return clusters[id];
  });
}

export function useClustersForEntity(entityId: string): Cluster[] {
  return useSelector(() => {
    const all = appState$.clusters.items.get();
    return Object.values(all).filter(
      (c) => c.members?.some((m) => m.entity_id === entityId)
    );
  });
}

export function useClustersLoading(): boolean {
  return useSelector(() => appState$.clusters.isLoading.get());
}

export const clusterActions = {
  setClusters(clusters: Cluster[]) {
    const map: Record<string, Cluster> = {};
    for (const cluster of clusters) {
      map[cluster.id] = cluster;
    }
    appState$.clusters.items.set(map);
    appState$.clusters.lastSync.set(new Date().toISOString());
  },

  addCluster(cluster: Cluster) {
    const items = appState$.clusters.items.get();
    appState$.clusters.items.set({ ...items, [cluster.id]: cluster });
  },

  updateCluster(id: string, updates: Partial<Cluster>) {
    const items = appState$.clusters.items.get();
    const current = items[id];
    if (current) {
      appState$.clusters.items.set({ ...items, [id]: { ...current, ...updates } });
    }
  },

  removeCluster(id: string) {
    const newItems = { ...appState$.clusters.items.get() };
    delete newItems[id];
    appState$.clusters.items.set(newItems);
  },

  setLoading(loading: boolean) {
    appState$.clusters.isLoading.set(loading);
  },
};

// ============================================
// Suggestions (WP 3.5 - Green Connections)
// ============================================

export function useSuggestedConnections(): SuggestedConnection[] {
  return useSelector(() => appState$.suggestions.connections.get());
}

export function usePendingSuggestions(): SuggestedConnection[] {
  return useSelector(() =>
    appState$.suggestions.connections.get().filter((s) => s.status === 'pending')
  );
}

export function useSuggestionsGenerating(): boolean {
  return useSelector(() => appState$.suggestions.isGenerating.get());
}

export function useSuggestionsSourceNote(): string | null {
  return useSelector(() => appState$.suggestions.sourceNoteId.get());
}

export const suggestionActions = {
  setSuggestions(suggestions: SuggestedConnection[], sourceNoteId: string) {
    appState$.suggestions.connections.set(suggestions);
    appState$.suggestions.sourceNoteId.set(sourceNoteId);
    appState$.suggestions.lastGeneratedAt.set(new Date().toISOString());
  },

  /**
   * Append new suggestions to existing ones, avoiding duplicates.
   * Used in 'always' mode where suggestions accumulate across note selections.
   */
  appendSuggestions(suggestions: SuggestedConnection[], sourceNoteId: string) {
    const current = appState$.suggestions.connections.get();

    // Create a set of existing pair keys to detect duplicates
    const existingPairs = new Set<string>();
    for (const s of current) {
      // Normalize pair key (sorted) to catch both A→B and B→A
      const pairKey = [s.sourceId, s.targetId].sort().join('-');
      existingPairs.add(pairKey);
    }

    // Filter out duplicates from new suggestions
    const newUnique = suggestions.filter((s) => {
      const pairKey = [s.sourceId, s.targetId].sort().join('-');
      return !existingPairs.has(pairKey);
    });

    // Append unique suggestions
    if (newUnique.length > 0) {
      appState$.suggestions.connections.set([...current, ...newUnique]);
    }
    appState$.suggestions.sourceNoteId.set(sourceNoteId);
    appState$.suggestions.lastGeneratedAt.set(new Date().toISOString());
  },

  addSuggestion(suggestion: SuggestedConnection) {
    const current = appState$.suggestions.connections.get();
    appState$.suggestions.connections.set([...current, suggestion]);
  },

  dismissSuggestion(id: string) {
    const current = appState$.suggestions.connections.get();
    appState$.suggestions.connections.set(
      current.map((s) => (s.id === id ? { ...s, status: 'dismissed' as const } : s))
    );
  },

  clearSuggestions() {
    appState$.suggestions.connections.set([]);
    appState$.suggestions.sourceNoteId.set(null);
    appState$.suggestions.lastGeneratedAt.set(null);
  },

  setGenerating(isGenerating: boolean) {
    appState$.suggestions.isGenerating.set(isGenerating);
  },

  removeSuggestion(id: string) {
    const current = appState$.suggestions.connections.get();
    appState$.suggestions.connections.set(current.filter((s) => s.id !== id));
  },

  removeSuggestionsForEntity(entityId: string) {
    const current = appState$.suggestions.connections.get();
    appState$.suggestions.connections.set(
      current.filter((s) => s.sourceId !== entityId && s.targetId !== entityId)
    );
  },
};

// ============================================
// Indexer Events (WP 3.5 - Global broadcasts)
// ============================================

export function useLastIndexedNoteId(): string | null {
  return useSelector(() => appState$.indexer.lastIndexedNoteId.get());
}

export const indexerActions = {
  noteIndexed(noteId: string) {
    appState$.indexer.lastIndexedNoteId.set(noteId);
    appState$.indexer.lastIndexedAt.set(new Date().toISOString());
  },

  clearLastIndexed() {
    appState$.indexer.lastIndexedNoteId.set(null);
    appState$.indexer.lastIndexedAt.set(null);
  },
};

// ============================================
// Resources (WP 6.2 - Resource Upload & Storage)
// ============================================

import { resourceState$ } from './resourceState';
import type { Resource } from '@/shared/types/resources';

export function useResources(): Resource[] {
  return useSelector(() => Object.values(resourceState$.resources.get()));
}

export function useResource(id: string): Resource | undefined {
  return useSelector(() => {
    const resources = resourceState$.resources.get();
    return resources[id];
  });
}

export function useResourcesLoading(): boolean {
  return useSelector(() => resourceState$.isLoading.get());
}

export function useSelectedResourceId(): string | null {
  return useSelector(() => resourceState$.selectedResourceId.get());
}

export function useUploadProgress(): number | null {
  return useSelector(() => resourceState$.uploadProgress.get());
}

// WP 6.3: Check if a specific resource is selected
export function useIsResourceSelected(id: string): boolean {
  return useSelector(() => resourceState$.selectedResourceId.get() === id);
}

export {
  resourceActions,
  setResourceAdapter,
  loadResources,
  uploadResource,
  addUrlResource,
  updateResource,
  deleteResource,
  getResourceBlob,
  selectResource,
} from './resourceActions';
