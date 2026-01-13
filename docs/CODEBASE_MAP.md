# ATHENA — Codebase Map

**Purpose:** Orient AI agents and developers to the codebase structure.  
**Rule:** Update at the END of every Work Package.

---

## Current State

| Item | Value |
|------|-------|
| **Last WP Completed** | 0.2 (SQLite WASM Setup) |
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
│   │   └── connection.ts         # Connection management
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
│   ├── shared/                   # ⏳ Empty - shared utilities
│   │   ├── components/           # Generic UI components
│   │   ├── hooks/                # Shared React hooks
│   │   ├── utils/                # Utility functions
│   │   └── types/                # TypeScript types
│   │
│   ├── adapters/                 # ⏳ WP 0.3 - Database adapters
│   ├── store/                    # ⏳ WP 0.4 - Legend-State
│   ├── config/                   # ⏳ WP 0.4 - DevSettings
│   │
│   ├── app/
│   │   ├── layout/               # ⏳ Phase 1 - App shell
│   │   └── routes/               # ⏳ Phase 1 - Routing
│   │
│   ├── App.tsx                   # ✅ Main app component (test UI)
│   ├── main.tsx                  # ✅ Entry point
│   └── index.css                 # ✅ Tailwind imports
│
├── docs/
│   ├── ARCHITECTURE.md           # System design
│   ├── DECISIONS.md              # ADRs
│   ├── LESSONS_LEARNED.md        # Gotchas
│   └── CHANGELOG.md              # What changed per WP
│
├── public/                       # Static assets
├── index.html                    # HTML entry
├── package.json
├── tsconfig.json                 # Strict mode enabled
├── vite.config.ts
├── tailwind.config.js            # Dark mode, tri-color system
├── eslint.config.js              # Flat config (ESLint 9+)
└── CODEBASE_MAP.md               # This file
```

**Legend:** ✅ Implemented | ⏳ Placeholder/Empty | ❌ Not started

---

## Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React app bootstrap |
| `src/App.tsx` | Root component (currently test UI) |
| `src/database/index.ts` | Database initialization |

---

## Key Modules

### Database (`src/database/`)

**Status:** ✅ Implemented in WP 0.2

**Exports:**
```typescript
// src/database/index.ts
export { initDatabase } from './init';
export type { DatabaseConnection } from './connection';
```

**Usage:**
```typescript
import { initDatabase } from './database';

const db = await initDatabase();
await db.run('CREATE TABLE ...', []);
const results = await db.exec('SELECT ...', []);
```

**Storage:** OPFS (Origin Private File System) with IndexedDB fallback

---

## Data Models

**Status:** ⏳ Coming in WP 0.3

Will include:
- `Entity` (notes, plans, documents)
- `Connection` (links between entities)
- `Embedding` (vector storage)

---

## Adapters

**Status:** ⏳ Coming in WP 0.3

Will include:
- `INoteAdapter` interface
- `IConnectionAdapter` interface
- `SQLiteNoteAdapter` implementation
- `SQLiteConnectionAdapter` implementation

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
| @sqlite.org/sqlite-wasm | * | SQLite in browser |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| vite | 6.x | Build tool |
| typescript | 5.x | Type checking |
| tailwindcss | 3.x | Styling |
| eslint | 9.x | Linting |

---

## Key Patterns

| Pattern | Location | Description |
|---------|----------|-------------|
| Database singleton | `src/database/init.ts` | Single DB instance, lazy init |

---

## Conventions

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `types.ts` or `*.types.ts`
- Constants: `SCREAMING_SNAKE_CASE`

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
| **0.3** | `src/adapters/`, `src/shared/types/`, Entity/Connection schemas |
| **0.4** | `src/store/`, `src/config/`, Legend-State, DevSettings |
| **1.1** | `src/app/layout/`, routing, app shell |

---

*Update this file at the end of every Work Package.*
