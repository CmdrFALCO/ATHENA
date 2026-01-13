import { useSelector } from '@legendapp/state/react';
import { appState$ } from './state';
import { devSettings$, type FeatureFlags } from '@/config';
import type { Note, Connection } from '@/shared/types';

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
  },

  toggleEntitySelection(id: string) {
    const current = appState$.ui.selectedEntityIds.get();
    if (current.includes(id)) {
      appState$.ui.selectedEntityIds.set(current.filter((i) => i !== id));
    } else {
      appState$.ui.selectedEntityIds.set([...current, id]);
    }
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
    const notes = appState$.entities.notes;
    notes[note.id]?.set(note);
  },

  updateNote(id: string, updates: Partial<Note>) {
    const notes = appState$.entities.notes.get();
    const current = notes[id];
    if (current) {
      appState$.entities.notes.set({ ...notes, [id]: { ...current, ...updates } });
    }
  },

  removeNote(id: string) {
    const notes = appState$.entities.notes.get();
    const { [id]: _, ...rest } = notes;
    appState$.entities.notes.set(rest);
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
  },

  removeConnection(id: string) {
    const items = appState$.connections.items.get();
    const { [id]: _, ...rest } = items;
    appState$.connections.items.set(rest);
  },
};
