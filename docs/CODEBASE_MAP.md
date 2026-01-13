# ATHENA — Codebase Map

**Purpose:** Orient AI agents and developers to the codebase structure.
**Rule:** Update at the END of every Work Package.

---

## Current State

| Item | Value |
|------|-------|
| **Last WP Completed** | 0.3 (Data Models + Adapters) |
| **Last Updated** | January 2026 |
| **Phase** | 0 (Foundation) |

---

## Project Structure

```
athena/
├── src/
│   ├── database/                 # ✅ WP 0.2 - SQLite WASM
│   │   ├── index.ts              # Main export (initDatabase)
│   │   ├── init.ts               # Database initialization + schema
│   │   └── schema.ts             # ✅ WP 0.3 - Table definitions
│   │
│   ├── adapters/                 # ✅ WP 0.3 - Database adapters
│   │   ├── index.ts              # Barrel exports
│   │   ├── context.ts            # React context + Adapters type
│   │   ├── hooks.ts              # useAdapters, useNoteAdapter, etc.
│   │   ├── AdapterProvider.tsx   # Provider component
│   │   ├── INoteAdapter.ts       # Note adapter interface
│   │   ├── IConnectionAdapter.ts # Connection adapter interface
│   │   ├── IEmbeddingAdapter.ts  # Embedding adapter interface
│   │   └── sqlite/
│   │       ├── SQLiteNoteAdapter.ts
│   │       ├── SQLiteConnectionAdapter.ts
│   │       └── SQLiteEmbeddingAdapter.ts
│   │
│   ├── shared/
│   │   ├── components/           # ⏳ Empty - Generic UI components
│   │   ├── hooks/                # ⏳ Empty - Shared React hooks
│   │   ├── utils/                # ⏳ Empty - Utility functions
│   │   └── types/                # ✅ WP 0.3 - TypeScript types
│   │       ├── index.ts          # Barrel export
│   │       ├── entities.ts       # Entity, Note, Plan, Document, Block
│   │       ├── connections.ts    # Connection, ConnectionType, ConnectionColor
│   │       └── embeddings.ts     # Embedding, SimilarityResult
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
│   ├── store/                    # ⏳ WP 0.4 - Legend-State
│   ├── config/                   # ⏳ WP 0.4 - DevSettings
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
│   ├── DECISIONS.md              # ADRs (4 recorded)
│   ├── LESSONS_LEARNED.md        # Gotchas
│   ├── CHANGELOG.md              # What changed per WP
│   └── CODEBASE_MAP.md           # This file
│
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

---

## Key Modules

### Database (`src/database/`)

**Status:** ✅ Implemented in WP 0.2, enhanced in WP 0.3

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

**Storage:** IndexedDB via IDBBatchAtomicVFS

---

### Adapters (`src/adapters/`)

**Status:** ✅ Implemented in WP 0.3

**Exports:**
```typescript
// Interfaces
export type { INoteAdapter, IConnectionAdapter, IEmbeddingAdapter } from './adapters';

// SQLite implementations
export { SQLiteNoteAdapter, SQLiteConnectionAdapter, SQLiteEmbeddingAdapter } from './adapters';

// Provider and hooks
export { AdapterProvider, useAdapters, useNoteAdapter, useConnectionAdapter, useEmbeddingAdapter } from './adapters';
```

**Usage:**
```typescript
import { AdapterProvider, useNoteAdapter } from '@/adapters';

// In App.tsx
<AdapterProvider adapters={adapters}>
  <MyComponent />
</AdapterProvider>

// In component
const noteAdapter = useNoteAdapter();
const notes = await noteAdapter.getAll();
await noteAdapter.create({ type: 'note', title: '...', ... });
```

---

## Data Models

**Status:** ✅ Implemented in WP 0.3

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

**Tables:** `entities`, `connections`, `embeddings`, `schema_meta`

**Indexes:**
- `idx_entities_type` - Filter by entity type
- `idx_entities_valid` - Bi-temporal queries
- `idx_connections_source/target` - Graph traversal
- `idx_connections_color` - Tri-color filtering
- `idx_embeddings_entity` - Embedding lookup

---

## State Management

**Status:** ⏳ Coming in WP 0.4

Will use Legend-State with:
- Entity store
- Connection store
- UI state
- DevSettings

---

## Dependencies

### Production
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.x | UI framework |
| react-dom | 19.x | React DOM renderer |
| wa-sqlite | 1.x | SQLite WASM |

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
| Bi-temporal | All entities/connections | `valid_at`/`invalid_at` for soft delete |
| Dependency injection | `AdapterProvider` | React context for adapters |

---

## Conventions

### Path Alias
Use `@/` for imports from `src/`:
```typescript
import { useNoteAdapter } from '@/adapters';
import type { Note } from '@/shared/types';
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

## Coming Next

| WP | What's Added |
|----|--------------|
| **0.4** | `src/store/`, `src/config/`, Legend-State, DevSettings |
| **1.1** | `src/app/layout/`, routing, app shell |

---

*Update this file at the end of every Work Package.*
