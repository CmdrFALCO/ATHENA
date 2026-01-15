# Store Module

**Location:** `src/store/`
**Status:** Implemented in WP 0.4, extended in WP 0.5, WP 3.5

## Purpose

Legend-State based reactive state management for entities, connections, and clusters with React hooks integration.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `state.ts` | appState$ observable (entities, connections, clusters, suggestions, indexer) |
| `hooks.ts` | React hooks + actions (incl. clusterActions, suggestionActions, indexerActions) |
| `useInitializeStore.ts` | Store initialization (loads all data from SQLite) |

---

## Public API

### Core State

```typescript
export { appState$ } from './state';
```

### Hooks

```typescript
export {
  // Entity hooks
  useNotes, useNote, useNotesLoading,

  // Connection hooks
  useConnections, useConnectionsFor,

  // Cluster hooks
  useClusters, useCluster, useClustersForEntity, useClustersLoading,

  // Settings hooks
  useFeatureFlag, useDevSettings,

  // Suggestions (WP 3.5)
  useSuggestedConnections, usePendingSuggestions,
  useSuggestionsGenerating, useSuggestionsSourceNote,

  // Indexer events (WP 3.5)
  useLastIndexedNoteId,

  // Actions
  uiActions, entityActions, connectionActions, clusterActions,
  suggestionActions, indexerActions,
} from './hooks';
```

### Initialization

```typescript
export { useInitializeStore } from './useInitializeStore';
```

---

## Usage Examples

### Basic Usage

```typescript
import { useNotes, useClusters, clusterActions } from '@/store';

function MyComponent() {
  const notes = useNotes();
  const clusters = useClusters();

  const handleAddCluster = (cluster) => {
    clusterActions.addCluster(cluster);
  };
}
```

### Entity Selection

```typescript
import { uiActions, useSelectedEntity } from '@/store';

// Select an entity
uiActions.selectEntity('note-123');

// Get selected entity
const selectedId = useSelectedEntity();
```

### Sidebar State

```typescript
import { useSidebarOpen, uiActions } from '@/store';

const isOpen = useSidebarOpen();
<button onClick={() => uiActions.toggleSidebar()}>Toggle</button>
```

### Store Initialization

```typescript
import { useInitializeStore } from '@/store';

function StoreInitializer({ children }) {
  const { isLoading, error } = useInitializeStore();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error} />;

  return children;
}
```

---

## State Structure

```typescript
interface AppState {
  // UI state
  ui: {
    selectedEntityId: string | null;
    sidebarOpen: boolean;
  };

  // Data state
  entities: Record<string, Entity>;
  connections: Record<string, Connection>;
  clusters: Record<string, Cluster>;

  // Loading state
  entitiesLoading: boolean;
  connectionsLoading: boolean;
  clustersLoading: boolean;

  // AI Suggestions (WP 3.5 - ephemeral, not persisted)
  suggestions: {
    connections: SuggestedConnection[];
    isGenerating: boolean;
    lastGeneratedAt: string | null;
    sourceNoteId: string | null;
  };

  // Indexer events (WP 3.5 - global broadcast)
  indexer: {
    lastIndexedNoteId: string | null;
    lastIndexedAt: string | null;
  };
}

// Suggested Connection type (WP 3.5)
interface SuggestedConnection {
  id: string;           // Temporary ID (not persisted to DB)
  sourceId: string;
  targetId: string;
  similarity: number;   // 0-1 confidence score
  generatedAt: string;
  status: 'pending' | 'dismissed';
}
```

---

## Actions Reference

### uiActions

| Action | Description |
|--------|-------------|
| `selectEntity(id)` | Set selected entity ID |
| `clearSelection()` | Clear entity selection |
| `toggleSidebar()` | Toggle sidebar open/closed |
| `setSidebarOpen(open)` | Set sidebar open state |

### entityActions

| Action | Description |
|--------|-------------|
| `setNotes(notes)` | Replace all notes |
| `addNote(note)` | Add a single note |
| `updateNote(id, updates)` | Update note properties |
| `removeNote(id)` | Remove note from state |

### connectionActions

| Action | Description |
|--------|-------------|
| `setConnections(connections)` | Replace all connections |
| `addConnection(connection)` | Add a single connection |
| `updateConnection(id, updates)` | Update connection properties |
| `removeConnection(id)` | Remove connection from state |

### clusterActions (WP 0.5)

| Action | Description |
|--------|-------------|
| `setClusters(clusters)` | Replace all clusters |
| `addCluster(cluster)` | Add a single cluster |
| `updateCluster(id, updates)` | Update cluster properties |
| `removeCluster(id)` | Remove cluster from state |

### suggestionActions (WP 3.5)

| Action | Description |
|--------|-------------|
| `setSuggestions(suggestions, sourceNoteId)` | Set suggestions for a note |
| `addSuggestion(suggestion)` | Add a single suggestion |
| `dismissSuggestion(id)` | Mark suggestion as dismissed |
| `clearSuggestions()` | Clear all suggestions |
| `setGenerating(isGenerating)` | Set generation status |
| `removeSuggestion(id)` | Remove a suggestion |
| `removeSuggestionsForEntity(entityId)` | Remove suggestions involving entity |

### indexerActions (WP 3.5)

| Action | Description |
|--------|-------------|
| `noteIndexed(noteId)` | Broadcast that a note was indexed |
| `clearLastIndexed()` | Clear last indexed tracking |

---

## Console Debugging

```javascript
// Access state observables in browser console
window.__ATHENA_STATE__       // Main app state (entities, connections, clusters)
window.__ATHENA_DEV_SETTINGS__ // Feature flags
```

---

## Related Patterns

- **Observable State** - Legend-State for reactive updates
- **Action Pattern** - Grouped actions for state mutations
- **Initialization Hook** - Async store hydration from SQLite

---

## Related Documentation

- [Adapters Module](ADAPTERS.md) - Database layer that populates store
- [Canvas Module](CANVAS.md) - Consumes store for graph visualization
- [Sophia Module](SOPHIA.md) - Consumes store for entity display
