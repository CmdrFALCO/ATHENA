# ATHENA — Codebase Map

**Purpose:** Orient AI agents and developers to the codebase structure.
**Rule:** Update at the END of every Work Package.

---

## Current State

| Item | Value |
|------|-------|
| **Last WP Completed** | 0.5 (Cluster Schema + Types) |
| **Last Updated** | January 2026 |
| **Phase** | 0 (Foundation) |

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
│   │   ├── hooks/                # ⏳ Empty - Shared React hooks
│   │   ├── utils/                # ⏳ Empty - Utility functions
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
│   ├── modules/                  # ⏳ Empty - future phases
│   │   ├── sophia/               # Phase 1+ (notes, connections)
│   │   ├── pronoia/              # Phase 6 (plans, decisions)
│   │   ├── ergane/               # Phase 6 (documents, export)
│   │   ├── canvas/               # Phase 2 (React Flow graph)
│   │   ├── validation/           # Phase 5 (CPN engine)
│   │   ├── ai/                   # Phase 3 (AI backends)
│   │   └── search/               # Phase 4 (FTS + vector)
│   │
│   ├── app/
│   │   ├── layout/               # ⏳ Phase 1 - App shell
│   │   └── routes/               # ⏳ Phase 1 - Routing
│   │
│   ├── App.tsx                   # ✅ Main app component (adapter test UI)
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
| `src/App.tsx` | Root component (adapter test UI) |
| `src/database/index.ts` | Database initialization |
| `src/adapters/index.ts` | Adapter exports |
| `src/store/index.ts` | State management exports |

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
| sql.js | 1.x | SQLite WASM |
| @legendapp/state | 3.x | State management |

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

## Coming Next

| WP | What's Added |
|----|--------------|
| **1.1** | `src/app/layout/`, routing, app shell |
| **2.x** | React Flow canvas integration |

---

*Update this file at the end of every Work Package.*
