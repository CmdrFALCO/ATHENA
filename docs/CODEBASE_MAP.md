# ATHENA — Codebase Map

**Purpose:** Orient AI agents and developers to the codebase structure.
**Rule:** Update at the END of every Work Package.

---

## Current State

| Item | Value |
|------|-------|
| **Last WP Completed** | 2.1 (React Flow Setup) |
| **Last Updated** | January 2026 |
| **Phase** | 2 (Graph Visualization) - In Progress |

---

## Project Structure

```
athena/
├── src/
│   ├── database/                 # ✅ WP 0.2 - SQLite WASM
│   │   ├── index.ts              # Main export (initDatabase)
│   │   ├── init.ts               # Database initialization
│   │   └── schema.ts             # ✅ WP 0.5 - Table definitions (entities, connections, embeddings, clusters, cluster_members)
│   │
│   ├── adapters/                 # ✅ WP 0.3/0.5 - Database adapters
│   │   ├── index.ts              # Barrel exports
│   │   ├── context.ts            # React context + Adapters type
│   │   ├── hooks.ts              # useAdapters, useNoteAdapter, useClusterAdapter, etc.
│   │   ├── AdapterProvider.tsx   # Provider component
│   │   ├── INoteAdapter.ts       # Note adapter interface
│   │   ├── IConnectionAdapter.ts # Connection adapter interface
│   │   ├── IEmbeddingAdapter.ts  # Embedding adapter interface
│   │   ├── IClusterAdapter.ts    # ✅ WP 0.5 - Cluster adapter interface
│   │   └── sqlite/
│   │       ├── SQLiteNoteAdapter.ts
│   │       ├── SQLiteConnectionAdapter.ts
│   │       ├── SQLiteEmbeddingAdapter.ts
│   │       └── SQLiteClusterAdapter.ts  # ✅ WP 0.5
│   │
│   ├── shared/
│   │   ├── components/           # ⏳ Empty - Generic UI components
│   │   ├── hooks/                # ✅ WP 1.4 - Shared React hooks
│   │   │   ├── index.ts          # Barrel export
│   │   │   └── useDebounce.ts    # Debounced callback hook
│   │   ├── theme/                # ✅ WP 2.1 - Theme constants
│   │   │   ├── index.ts          # Barrel export
│   │   │   └── colors.ts         # ATHENA_COLORS centralized colors
│   │   ├── utils/                # ✅ WP 1.2 - Utility functions
│   │   │   ├── index.ts          # Barrel export
│   │   │   └── formatTime.ts     # Relative time formatting
│   │   └── types/                # ✅ WP 0.3/0.5 - TypeScript types
│   │       ├── index.ts          # Barrel export
│   │       ├── entities.ts       # Entity, Note, Plan, Document, Block
│   │       ├── connections.ts    # Connection, ConnectionType, ConnectionColor
│   │       ├── embeddings.ts     # Embedding, SimilarityResult
│   │       └── clusters.ts       # ✅ WP 0.5 - Cluster, ClusterMember, ClusterType, MemberRole
│   │
│   ├── store/                    # ✅ WP 0.4/0.5 - Legend-State
│   │   ├── index.ts              # Barrel export
│   │   ├── state.ts              # appState$ observable (entities, connections, clusters)
│   │   ├── hooks.ts              # React hooks + actions (incl. clusterActions)
│   │   └── useInitializeStore.ts # Store initialization (loads all data from SQLite)
│   │
│   ├── config/                   # ✅ WP 0.4 - DevSettings
│   │   ├── index.ts              # Barrel export
│   │   ├── devSettings.ts        # devSettings$ observable (feature flags)
│   │   └── DevSettingsPanel.tsx  # UI panel (Ctrl+Shift+D)
│   │
│   ├── modules/
│   │   ├── canvas/               # ✅ WP 2.1 - React Flow graph canvas
│   │   │   ├── index.ts          # Module barrel export
│   │   │   ├── components/
│   │   │   │   ├── index.ts      # Component exports
│   │   │   │   └── GraphCanvas.tsx  # React Flow canvas component
│   │   │   └── hooks/
│   │   │       └── index.ts      # Canvas hooks (future WPs)
│   │   ├── sophia/               # ✅ WP 1.2-1.5 - Knowledge workspace
│   │   │   ├── index.ts          # Module barrel export
│   │   │   └── components/
│   │   │       ├── index.ts            # Component exports
│   │   │       ├── EntityList.tsx      # Note list container
│   │   │       ├── EntityListItem.tsx  # Single note item
│   │   │       ├── EntityDetail.tsx    # ✅ WP 1.3 - Note detail view
│   │   │       ├── EntityDetailEmpty.tsx    # Empty state
│   │   │       ├── EntityDetailHeader.tsx   # Header with title/meta
│   │   │       ├── EntityDetailContent.tsx  # Content display (uses EditorContainer)
│   │   │       ├── EditorContainer.tsx      # ✅ WP 1.4 - Editor wrapper with auto-save
│   │   │       ├── NoteEditor.tsx           # ✅ WP 1.4 - Tiptap editor instance
│   │   │       └── EditorToolbar.tsx        # ✅ WP 1.4 - Formatting toolbar
│   │   ├── pronoia/              # ⏳ Phase 6 (plans, decisions)
│   │   ├── ergane/               # ⏳ Phase 6 (documents, export)
│   │   ├── validation/           # ⏳ Phase 5 (CPN engine)
│   │   ├── ai/                   # ⏳ Phase 3 (AI backends)
│   │   └── search/               # ⏳ Phase 4 (FTS + vector)
│   │
│   ├── app/                      # ✅ WP 1.1 - App shell
│   │   ├── index.ts              # Barrel export
│   │   ├── layout/               # ✅ WP 1.1 - Layout components
│   │   │   ├── index.ts          # Barrel export
│   │   │   ├── AppLayout.tsx     # Main layout wrapper (Header, Sidebar, content)
│   │   │   ├── Header.tsx        # Top header bar (title, sidebar toggle)
│   │   │   ├── Sidebar.tsx       # Collapsible sidebar (240px/64px)
│   │   │   └── StoreInitializer.tsx # Store initialization wrapper
│   │   └── routes/               # ✅ WP 1.1 - TanStack Router
│   │       ├── index.tsx         # Router configuration + route tree
│   │       ├── SophiaPage.tsx    # Knowledge workspace placeholder
│   │       ├── PronoiaPage.tsx   # Planning workspace placeholder
│   │       └── ErganePage.tsx    # Creation workspace placeholder
│   │
│   ├── App.tsx                   # ✅ Root component (RouterProvider wrapper)
│   ├── main.tsx                  # ✅ Entry point
│   └── index.css                 # ✅ Tailwind imports
│
├── docs/
│   ├── ARCHITECTURE.md           # System design
│   ├── DECISIONS.md              # ADRs
│   ├── LESSONS_LEARNED.md        # Gotchas
│   └── CODEBASE_MAP.md           # This file
│
├── CHANGELOG.md                  # What changed per WP
├── CODEBASE_MAP.md               # Root-level codebase map
├── public/                       # Static assets
├── index.html                    # HTML entry
├── package.json
├── tsconfig.json                 # Strict mode enabled
├── tsconfig.app.json             # Path alias @/ configured
├── vite.config.ts                # Path alias + WASM config
├── tailwind.config.js            # Dark mode, tri-color system
└── eslint.config.js              # Flat config (ESLint 9+)
```

**Legend:** ✅ Implemented | ⏳ Placeholder/Empty | ❌ Not started

---

## Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React app bootstrap |
| `src/App.tsx` | Root component (RouterProvider wrapper) |
| `src/app/routes/index.tsx` | Router configuration + route tree |
| `src/database/index.ts` | Database initialization |
| `src/adapters/index.ts` | Adapter exports |
| `src/store/index.ts` | State management exports |
| `src/modules/canvas/index.ts` | Canvas module exports |
| `src/modules/sophia/index.ts` | Sophia module exports |
| `src/shared/theme/index.ts` | Theme constants exports |
| `src/shared/utils/index.ts` | Utility function exports |
| `src/shared/hooks/index.ts` | Shared hooks exports |

---

## Key Modules

### Database (`src/database/`)

**Status:** ✅ Implemented in WP 0.2, enhanced in WP 0.3/0.5

**Exports:**
```typescript
// src/database/index.ts
export { initDatabase, getDatabase } from './init';
export type { DatabaseConnection } from './init';
```

**Usage:**
```typescript
import { initDatabase } from './database';

const db = await initDatabase();
await db.run('INSERT INTO entities ...', [params]);
const results = await db.exec<Entity>('SELECT * FROM entities', []);
```

**Storage:** In-memory (sql.js). IndexedDB persistence planned for future WP.

---

### Adapters (`src/adapters/`)

**Status:** ✅ Implemented in WP 0.3, extended in WP 0.5

**Exports:**
```typescript
// Interfaces
export type { INoteAdapter, IConnectionAdapter, IEmbeddingAdapter, IClusterAdapter } from './adapters';

// SQLite implementations
export { SQLiteNoteAdapter, SQLiteConnectionAdapter, SQLiteEmbeddingAdapter, SQLiteClusterAdapter } from './adapters';

// Provider and hooks
export { AdapterProvider, useAdapters, useNoteAdapter, useConnectionAdapter, useEmbeddingAdapter, useClusterAdapter } from './adapters';
```

**Usage:**
```typescript
import { AdapterProvider, useNoteAdapter, useClusterAdapter } from '@/adapters';

// In App.tsx
<AdapterProvider adapters={adapters}>
  <MyComponent />
</AdapterProvider>

// In component
const noteAdapter = useNoteAdapter();
const clusterAdapter = useClusterAdapter();

const notes = await noteAdapter.getAll();
const cluster = await clusterAdapter.create({
  label: 'Thermal Runaway Discussion',
  type: 'concept',
  color: 'blue',
  created_by: 'user',
  members: [
    { entity_id: 'note-1', role: 'participant' },
    { entity_id: 'note-2', role: 'participant' },
  ]
});
```

---

### State Management (`src/store/`)

**Status:** ✅ Implemented in WP 0.4, extended in WP 0.5

**Exports:**
```typescript
// Core state
export { appState$ } from './state';

// Hooks
export {
  useNotes, useNote, useNotesLoading,
  useConnections, useConnectionsFor,
  useClusters, useCluster, useClustersForEntity, useClustersLoading,
  useFeatureFlag, useDevSettings,
  uiActions, entityActions, connectionActions, clusterActions,
} from './hooks';

// Initialization
export { useInitializeStore } from './useInitializeStore';
```

**Usage:**
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

---

### Canvas Module (`src/modules/canvas/`)

**Status:** ✅ Implemented in WP 2.1

**Components:**
- `GraphCanvas` - React Flow canvas with Background, Controls, MiniMap

**Exports:**
```typescript
// src/modules/canvas/index.ts
export { GraphCanvas } from './components';
```

**Usage:**
```typescript
import { GraphCanvas } from '@/modules/canvas';

// In SophiaPage - side by side with EntityDetail
<div className="flex h-full">
  <div className="flex-1 min-w-0">
    <GraphCanvas />
  </div>
  <div className="w-[400px] border-l">
    <EntityDetail />
  </div>
</div>
```

**Features:**
- Dark themed canvas (`#1a1a1a` background)
- Dot grid background pattern
- Pan and zoom controls
- MiniMap for navigation
- Empty state (nodes added in WP 2.2)

---

### Theme (`src/shared/theme/`)

**Status:** ✅ Implemented in WP 2.1

**Exports:**
```typescript
// src/shared/theme/index.ts
export { ATHENA_COLORS } from './colors';
export type { ConnectionColor, NodeColor } from './colors';
```

**Usage:**
```typescript
import { ATHENA_COLORS } from '@/shared/theme';

// Connection colors
ATHENA_COLORS.connection.explicit  // '#3b82f6' - Blue
ATHENA_COLORS.connection.semantic  // '#22c55e' - Green

// Node colors by entity type
ATHENA_COLORS.node.note     // '#3b82f6' - Blue
ATHENA_COLORS.node.plan     // '#f59e0b' - Amber
ATHENA_COLORS.node.document // '#8b5cf6' - Purple

// Surface colors
ATHENA_COLORS.surface.canvas     // '#1a1a1a'
ATHENA_COLORS.surface.node       // '#252525'
ATHENA_COLORS.surface.nodeBorder // '#3a3a3a'
```

---

### App Shell (`src/app/`)

**Status:** ✅ Implemented in WP 1.1

**Components:**
- `AppLayout` - Main layout wrapper with Header, Sidebar, and content area
- `Header` - Top header with app title and sidebar toggle
- `Sidebar` - Collapsible navigation (240px expanded, 64px collapsed)
- `StoreInitializer` - Wraps content to ensure store is initialized

**Routes:**
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect | Redirects to `/sophia` |
| `/sophia` | SophiaPage | Knowledge workspace (Bird icon) |
| `/pronoia` | PronoiaPage | Planning workspace (Swords icon) |
| `/ergane` | ErganePage | Creation workspace (Hammer icon) |

**Usage:**
```typescript
import { Link, useLocation } from '@tanstack/react-router';

// Navigation link with active state
<Link
  to="/sophia"
  className={location.pathname === '/sophia' ? 'active' : ''}
>
  Sophia
</Link>

// Sidebar toggle
import { useSidebarOpen, uiActions } from '@/store';

const isOpen = useSidebarOpen();
<button onClick={() => uiActions.toggleSidebar()}>Toggle</button>
```

**Styling:**
- Dark theme colors: `athena-bg`, `athena-surface`, `athena-border`, `athena-text`, `athena-muted`
- Sidebar width: 240px (expanded), 64px (collapsed)
- Header height: 48px
- Smooth transitions: `transition-all duration-200`

---

### Sophia Module (`src/modules/sophia/`)

**Status:** ✅ Implemented in WP 1.2-1.5

**Components:**
- `EntityList` - Note list container with loading/empty states
- `EntityListItem` - Single note item with title, icon, and timestamp
- `EntityDetail` - Main detail view for selected note (WP 1.3)
- `EntityDetailEmpty` - Empty state when no note selected
- `EntityDetailHeader` - Header with editable title, delete button (WP 1.5)
- `EntityDetailContent` - Content display (uses EditorContainer)
- `EditorContainer` - Editor wrapper with auto-save logic (WP 1.4)
- `NoteEditor` - Tiptap editor instance (WP 1.4)
- `EditorToolbar` - Formatting toolbar (WP 1.4)

**Exports:**
```typescript
// src/modules/sophia/index.ts
export { EntityList, EntityListItem, EntityDetail, EditorContainer, NoteEditor, EditorToolbar } from './components';
```

**Usage:**
```typescript
import { EntityList, EntityDetail } from '@/modules/sophia';

// In Sidebar
<EntityList />  // Displays all notes with selection support

// In SophiaPage
<EntityDetail />  // Shows selected note with Tiptap editor
```

**Features:**
- Displays notes sorted by `updated_at` descending
- Loading state while store initializes
- Empty state when no notes exist
- Single selection with visual highlight
- Relative time display (e.g., "5 minutes ago")
- Note detail view with title, type badge, timestamps
- Rich text editing with Tiptap (WP 1.4)
- Auto-save with 500ms debounce
- Formatting toolbar (bold, italic, headings, lists, code, undo/redo)
- **CRUD Operations** (WP 1.5):
  - Create: Plus button in sidebar header creates new note
  - Rename: Editable title in EntityDetailHeader (saves on blur/Enter)
  - Delete: Trash button with confirmation dialog

---

### Utilities (`src/shared/utils/`)

**Status:** ✅ Implemented in WP 1.2/1.3

**Exports:**
```typescript
// src/shared/utils/index.ts
export { formatRelativeTime, formatDate } from './formatTime';
```

**Usage:**
```typescript
import { formatRelativeTime, formatDate } from '@/shared/utils';

formatRelativeTime('2026-01-13T12:00:00Z');
// Returns: "5 minutes ago", "yesterday", "Jan 13", etc.

formatDate('2026-01-13T12:00:00Z');
// Returns: "Jan 13, 2026"
```

---

### Shared Hooks (`src/shared/hooks/`)

**Status:** ✅ Implemented in WP 1.4

**Exports:**
```typescript
// src/shared/hooks/index.ts
export { useDebouncedCallback } from './useDebounce';
```

**Usage:**
```typescript
import { useDebouncedCallback } from '@/shared/hooks';

const debouncedSave = useDebouncedCallback(async (content) => {
  await saveToDatabase(content);
}, 500);

// Called on every change, but only executes after 500ms of inactivity
debouncedSave(newContent);
```

---

## Data Models

### Entity (`src/shared/types/entities.ts`)
```typescript
interface Entity {
  id: string;                    // UUID
  type: 'note' | 'plan' | 'document';
  subtype: string;               // Template-defined
  title: string;
  content: Block[];              // Tiptap JSON
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  valid_at: string;              // Bi-temporal
  invalid_at: string | null;     // Bi-temporal (null = current)
  position_x: number;
  position_y: number;
}
```

### Connection (`src/shared/types/connections.ts`)
```typescript
interface Connection {
  id: string;
  source_id: string;
  target_id: string;
  type: 'explicit' | 'semantic' | 'validation';
  color: 'blue' | 'green' | 'red' | 'amber';
  label: string | null;
  confidence: number | null;
  created_by: 'user' | 'ai' | 'system';
  created_at: string;
  valid_at: string;
  invalid_at: string | null;
}
```

### Cluster (`src/shared/types/clusters.ts`) — NEW in WP 0.5
```typescript
type ClusterType = 'concept' | 'sequence' | 'hierarchy' | 'contradiction' | 'dependency';
type MemberRole = 'source' | 'target' | 'participant' | 'hub' | 'evidence' | 'claim';

interface ClusterMember {
  entity_id: string;
  role: MemberRole;
  position?: number;    // For ordered clusters (sequence)
  added_at: string;
}

interface Cluster {
  id: string;
  label: string;
  description?: string;
  type: ClusterType;
  color: 'blue' | 'green' | 'red' | 'amber';
  members?: ClusterMember[];
  created_by: 'user' | 'ai' | 'system';
  confidence?: number;  // 0-1 for AI-suggested clusters
  created_at: string;
  valid_at: string;
  invalid_at: string | null;
}
```

### Embedding (`src/shared/types/embeddings.ts`)
```typescript
interface Embedding {
  id: string;
  entity_id: string;
  chunk_index: number;
  vector: number[];
  model: string;
  created_at: string;
}
```

---

## Database Schema

**Tables:** `entities`, `connections`, `embeddings`, `clusters`, `cluster_members`, `schema_meta`

**Indexes:**
- `idx_entities_type` - Filter by entity type
- `idx_entities_valid` - Bi-temporal queries
- `idx_connections_source/target` - Graph traversal
- `idx_connections_color` - Tri-color filtering
- `idx_embeddings_entity` - Embedding lookup
- `idx_cluster_members_entity` - Cluster membership lookup
- `idx_clusters_type` - Filter by cluster type
- `idx_clusters_color` - Filter by cluster color
- `idx_clusters_valid` - Bi-temporal queries

---

## Dependencies

### Production
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.x | UI framework |
| react-dom | 19.x | React DOM renderer |
| @tanstack/react-router | 1.x | Client-side routing |
| @xyflow/react | 12.x | React Flow graph visualization |
| lucide-react | 0.x | Icon library |
| sql.js | 1.x | SQLite WASM |
| @legendapp/state | 3.x | State management |
| @tiptap/react | 2.x | Rich text editor (React bindings) |
| @tiptap/starter-kit | 2.x | Common editor extensions |
| @tiptap/extension-placeholder | 2.x | Placeholder text support |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| vite | 7.x | Build tool |
| typescript | 5.9.x | Type checking |
| tailwindcss | 3.x | Styling |
| eslint | 9.x | Linting |

---

## Key Patterns

| Pattern | Location | Description |
|---------|----------|-------------|
| Database singleton | `src/database/init.ts` | Single DB instance, lazy init |
| Adapter pattern | `src/adapters/` | Interface + implementation separation |
| Bi-temporal | All entities/connections/clusters | `valid_at`/`invalid_at` for soft delete |
| Dependency injection | `AdapterProvider` | React context for adapters |
| Observable state | `src/store/state.ts` | Legend-State for reactive updates |
| N-way relationships | Clusters | Junction pattern for multi-entity relationships |

---

## Conventions

### Path Alias
Use `@/` for imports from `src/`:
```typescript
import { useNoteAdapter, useClusterAdapter } from '@/adapters';
import type { Note, Cluster } from '@/shared/types';
```

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `types.ts` or in `types/` folder
- Interfaces: `IName.ts`

### Import Order
1. React/external libraries
2. Internal modules (`@/`)
3. Relative imports (`./`)
4. Types (with `type` keyword)

### Module Exports
- Each module has `index.ts` barrel export
- Export interfaces separately from implementations

---

## Console Debugging

```javascript
// Access state observables in browser console
window.__ATHENA_STATE__       // Main app state (entities, connections, clusters)
window.__ATHENA_DEV_SETTINGS__ // Feature flags
```

---

## Phase Status

- **Phase 0** (Foundation): Complete
  - WP 0.1: Project scaffold
  - WP 0.2: SQLite WASM integration
  - WP 0.3: Data models and adapters
  - WP 0.4: State layer + DevSettings
  - WP 0.5: Cluster schema and types

- **Phase 1** (Core UI): Complete
  - WP 1.1: App shell + routing (Complete)
  - WP 1.2: Entity list in sidebar (Complete)
  - WP 1.3: Entity detail view (Complete)
  - WP 1.4: Tiptap rich text editor (Complete)
  - WP 1.5: Entity CRUD (Complete)

- **Phase 2** (Graph Visualization): In Progress
  - WP 2.1: React Flow setup (Complete)

## Known Issues

Pre-existing lint errors to address:
- `src/adapters/sqlite/SQLiteClusterAdapter.ts:190` - `'_reason' is defined but never used`
- `src/store/hooks.ts:124,150,205` - `'_' is assigned a value but never used`

## Coming Next

| WP | What's Added |
|----|--------------|
| **2.2** | Entity nodes on canvas |
| **2.3** | Node positioning (drag to reposition) |
| **2.4** | Blue connections (drag between nodes) |
| **2.5** | Connection inspector |
| **3.x** | AI backends integration |
| **4.x** | Full-text search + vector search |

---

*Update this file at the end of every Work Package.*
