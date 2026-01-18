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
| **Last WP Completed** | 5.4 (Validation Service & Store) |
| **Last Updated** | January 2026 |
| **Phase** | 5 (Validation) - In Progress |
| **Milestone** | Usability Milestone - Daily use viable |

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
│   │   ├── validation/           # 🔄 Types, Engine, Rules, Service, Store, Hooks
│   │   └── search/               # ✅ FTS5 keyword + semantic + hybrid search (RRF) + Command Palette + Faceted Search Panel
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
| Validation | `src/modules/validation/` | [docs/modules/VALIDATION.md](docs/modules/VALIDATION.md) | ✅ |
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
| Semantic search | `src/adapters/sqlite/` | Embed query → find similar → map to SearchResult |
| Hybrid search (RRF) | `src/modules/search/services/` | Reciprocal Rank Fusion to combine keyword + semantic results |
| Faceted search | `src/modules/search/` | FacetService extracts facets, applies filters with OR within / AND across |
| Vendor modules | `src/vendor/` | Custom builds (sql.js with FTS5+JSON1) |
| SHACL-inspired validation | `src/modules/validation/` | Pure evaluation functions returning violations |
| Bridge interface | `src/modules/validation/interfaces/` | IValidationService allows Phase 5A/5B impl swap |
| Rules Engine | `src/modules/validation/engine/` | Stateless rule evaluation with context indexes |
| MVP Rules | `src/modules/validation/rules/` | 6 validation rules (orphan, self-loop, duplicate, bidirectional, weakly-connected, stale) |
| Validation Store | `src/modules/validation/store/` | Legend-State slice for violations, reports, dismissed IDs |
| Validation Service | `src/modules/validation/services/` | SimpleValidationService implements IValidationService interface |
| Validation Hooks | `src/modules/validation/hooks/` | useValidation, useViolations, useViolationsFor for React components |

**See [docs/PATTERNS.md](docs/PATTERNS.md) for detailed examples and usage.**

---

## Data Models

| Type | Location | Description |
|------|----------|-------------|
| Entity | `src/shared/types/entities.ts` | Note, Plan, Document with bi-temporal |
| Connection | `src/shared/types/connections.ts` | Entity relationships with tri-color |
| Cluster | `src/shared/types/clusters.ts` | N-way groupings with member roles |
| Embedding | `src/shared/types/embeddings.ts` | Vector storage for similarity |
| SearchResult | `src/adapters/ISearchAdapter.ts` | Search result with snippet, score, matchType, createdAt, updatedAt |
| Facet | `src/modules/search/types/facets.ts` | Facet definition with values and counts for filtering |
| SuggestedConnection | `src/store/state.ts` | AI-suggested connections (ephemeral, not persisted) |
| ValidationRule | `src/modules/validation/types/rules.ts` | SHACL-inspired rule definition with evaluate function |
| ValidationContext | `src/modules/validation/types/rules.ts` | Graph snapshot with pre-built indexes for rule evaluation |
| Violation | `src/modules/validation/types/violations.ts` | Validation result with focus node, message, and fix suggestion |
| ValidationReport | `src/modules/validation/types/reports.ts` | Complete validation run results with summary stats |
| IValidationService | `src/modules/validation/interfaces/` | Bridge interface for Phase 5A/5B swap |
| RulesEngine | `src/modules/validation/engine/` | Stateless engine for rule registration and evaluation |
| ContextBuilderInput | `src/modules/validation/engine/` | Input for building ValidationContext with O(1) indexes |
| ValidationState | `src/modules/validation/store/` | Legend-State slice with violations, lastReport, dismissedIds |

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
| **5.x** | CPN validation engine |
| **6.x** | Plans and documents |

---

## Console Debugging

```javascript
window.__ATHENA_STATE__           // Main app state
window.__ATHENA_DEV_SETTINGS__    // Feature flags
window.__ATHENA_VALIDATION_STATE__ // Validation state (violations, reports)
```

---

*Update this file at the end of every Work Package.*
