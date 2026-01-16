# ATHENA — Codebase Map

**Purpose:** Orient AI agents and developers to the codebase structure.
**Rule:** Update at the END of every Work Package.

---

## Quick Links

- [Module Documentation](docs/modules/) - Detailed docs for each module
- [Code Patterns](docs/PATTERNS.md) - Implementation patterns with examples
- [Phase History](docs/PHASE_HISTORY.md) - Completed phases and bug fixes

---

## Current State

| Item | Value |
|------|-------|
| **Last WP Completed** | 4.3 (Keyword Search) |
| **Last Updated** | January 2026 |
| **Phase** | 4 (Search) - In Progress |

---

## Project Structure

```
athena/
├── src/
│   ├── database/                 # SQLite WASM
│   │   └── migrations/           # Schema migrations (FTS5, etc.)
│   ├── adapters/                 # Database adapters
│   │   └── sqlite/               # SQLite implementations
│   ├── vendor/                   # Vendored dependencies
│   │   └── sql.js/               # Custom sql.js build (FTS5+JSON1)
│   ├── shared/
│   │   ├── components/           # Generic UI components
│   │   ├── hooks/                # Shared React hooks
│   │   ├── theme/                # Theme constants
│   │   ├── utils/                # Utility functions (formatTime, extractTextFromTiptap)
│   │   └── types/                # TypeScript types
│   ├── store/                    # Legend-State
│   ├── config/                   # DevSettings
│   ├── services/
│   │   └── secureStorage/        # Encrypted storage
│   ├── modules/
│   │   ├── canvas/               # React Flow graph
│   │   ├── sophia/               # Knowledge workspace
│   │   ├── ai/                   # AI backend
│   │   ├── pronoia/              # ⏳ Plans, decisions
│   │   ├── ergane/               # ⏳ Documents, export
│   │   ├── validation/           # ⏳ CPN engine
│   │   └── search/               # ✅ FTS5 keyword search + Command Palette
│   ├── app/                      # App shell
│   │   ├── layout/               # Layout components
│   │   └── routes/               # TanStack Router
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Tailwind imports
├── public/
│   └── vendor/
│       └── sql.js/               # Custom WASM binary
├── tools/
│   └── sql.js-custom/            # sql.js build config (git-ignored)
├── docs/
│   ├── modules/                  # Module documentation
│   ├── PATTERNS.md               # Code patterns
│   ├── PHASE_HISTORY.md          # Phase archive
│   ├── ARCHITECTURE.md           # System design
│   ├── DECISIONS.md              # ADRs
│   └── LESSONS_LEARNED.md        # Gotchas
├── CODEBASE_MAP.md               # This file
├── CHANGELOG.md                  # What changed per WP
└── [config files]                # vite, tailwind, eslint, etc.
```

**Legend:** ✅ Implemented | ⏳ Placeholder/Empty | ❌ Not started

---

## Module Index

| Module | Location | Documentation | Status |
|--------|----------|---------------|--------|
| Database | `src/database/` | [docs/modules/ADAPTERS.md](docs/modules/ADAPTERS.md) | ✅ |
| Adapters | `src/adapters/` | [docs/modules/ADAPTERS.md](docs/modules/ADAPTERS.md) | ✅ |
| Store | `src/store/` | [docs/modules/STORE.md](docs/modules/STORE.md) | ✅ |
| Canvas | `src/modules/canvas/` | [docs/modules/CANVAS.md](docs/modules/CANVAS.md) | ✅ |
| Sophia | `src/modules/sophia/` | [docs/modules/SOPHIA.md](docs/modules/SOPHIA.md) | ✅ |
| AI | `src/modules/ai/` | [docs/modules/AI.md](docs/modules/AI.md) | ✅ |
| App Shell | `src/app/` | [docs/modules/APP.md](docs/modules/APP.md) | ✅ |
| Secure Storage | `src/services/secureStorage/` | [docs/modules/AI.md](docs/modules/AI.md) | ✅ |
| Theme | `src/shared/theme/` | [docs/modules/APP.md](docs/modules/APP.md) | ✅ |
| Search | `src/modules/search/` | — | ✅ |
| Vendor | `src/vendor/` | — | ✅ |

---

## Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React app bootstrap |
| `src/App.tsx` | Root component (RouterProvider wrapper) |
| `src/app/routes/index.tsx` | Router configuration + route tree |
| `src/database/index.ts` | Database initialization |

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
| Secure storage | `src/services/secureStorage/` | Web Crypto API + IndexedDB for API keys |
| AI abstraction | `src/modules/ai/` | Backend interface + service orchestrator |
| Tri-color connections | `src/modules/canvas/` | Blue (explicit), Green (AI-suggested), Red (validation) |
| FTS5 full-text search | `src/database/migrations/` | Sync triggers + content_text extraction + bm25() ranking |
| Vendor modules | `src/vendor/` | Custom builds (sql.js with FTS5+JSON1) |

**See [docs/PATTERNS.md](docs/PATTERNS.md) for detailed examples and usage.**

---

## Data Models

| Type | Location | Description |
|------|----------|-------------|
| Entity | `src/shared/types/entities.ts` | Note, Plan, Document with bi-temporal |
| Connection | `src/shared/types/connections.ts` | Entity relationships with tri-color |
| Cluster | `src/shared/types/clusters.ts` | N-way groupings with member roles |
| Embedding | `src/shared/types/embeddings.ts` | Vector storage for similarity |
| SearchResult | `src/adapters/ISearchAdapter.ts` | FTS5 search result with snippet and BM25 score |
| SuggestedConnection | `src/store/state.ts` | AI-suggested connections (ephemeral, not persisted) |

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
| @tiptap/react | 2.x | Rich text editor |
| @tiptap/starter-kit | 2.x | Editor extensions |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| vite | 7.x | Build tool |
| typescript | 5.9.x | Type checking |
| tailwindcss | 3.x | Styling |
| eslint | 9.x | Linting |

---

## Coming Next

| WP | What's Added |
|----|--------------|
| **4.4** | Semantic search (vector similarity with embeddings) |
| **4.5** | Hybrid search (combine keyword + semantic results) |
| **5.x** | CPN validation engine |
| **6.x** | Plans and documents |

---

## Console Debugging

```javascript
window.__ATHENA_STATE__       // Main app state
window.__ATHENA_DEV_SETTINGS__ // Feature flags
```

---

*Update this file at the end of every Work Package.*
