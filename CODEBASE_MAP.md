# ATHENA Codebase Map

## Overview

ATHENA is a React + TypeScript web application that serves as a "Second Brain" knowledge management system. It uses sql.js (SQLite compiled to WebAssembly) for local-first data persistence and Legend-State for reactive state management.

## Directory Structure

```
src/
├── adapters/                    # Data access layer
│   ├── index.ts                 # Barrel export
│   ├── INoteAdapter.ts          # Note adapter interface
│   ├── IConnectionAdapter.ts    # Connection adapter interface
│   ├── IEmbeddingAdapter.ts     # Embedding adapter interface
│   ├── IClusterAdapter.ts       # Cluster adapter interface
│   ├── context.ts               # Adapter context definition
│   ├── AdapterProvider.tsx      # React context provider
│   ├── hooks.ts                 # useNoteAdapter, useConnectionAdapter, useClusterAdapter, etc.
│   └── sqlite/                  # SQLite implementations
│       ├── SQLiteNoteAdapter.ts
│       ├── SQLiteConnectionAdapter.ts
│       ├── SQLiteEmbeddingAdapter.ts
│       └── SQLiteClusterAdapter.ts
│
├── config/                      # Configuration & feature flags
│   ├── index.ts                 # Barrel export
│   ├── devSettings.ts           # DevSettings store (feature flags)
│   └── DevSettingsPanel.tsx     # DevSettings UI panel
│
├── database/                    # SQLite WASM setup
│   ├── index.ts                 # Barrel export
│   ├── init.ts                  # Database initialization
│   └── schema.ts                # SQL schema definitions
│
├── shared/
│   └── types/                   # TypeScript type definitions
│       ├── index.ts             # Barrel export
│       ├── entities.ts          # Entity, Note, Plan, Document types
│       ├── connections.ts       # Connection types
│       ├── embeddings.ts        # Embedding types
│       └── clusters.ts          # Cluster and ClusterMember types
│
├── store/                       # State management (Legend-State)
│   ├── index.ts                 # Barrel export
│   ├── state.ts                 # Core observable state (appState$)
│   ├── hooks.ts                 # React hooks + actions
│   └── useInitializeStore.ts    # Store initialization hook
│
├── App.tsx                      # Main application component
├── main.tsx                     # React entry point
└── index.css                    # Global styles (Tailwind)
```

## Key Components

### State Management (`src/store/`)

- **appState$**: Main observable containing UI state, entity cache, connection cache, and cluster cache
- **devSettings$**: Observable for feature flags and debug settings
- **Hooks**: `useNotes()`, `useConnections()`, `useClusters()`, `useClustersForEntity()`, `useFeatureFlag()`, etc.
- **Actions**: `uiActions`, `entityActions`, `connectionActions`, `clusterActions`

### Data Adapters (`src/adapters/`)

- **Pattern**: Interface-based adapter pattern for data access
- **Current Implementation**: sql.js (in-memory SQLite WASM)
- **Usage**: Access via hooks (`useNoteAdapter()`, etc.) within AdapterProvider

### Configuration (`src/config/`)

- **DevSettings**: Feature flags for phased feature rollout
- **Access**: Ctrl+Shift+D opens DevSettings panel
- **Persistence**: localStorage via Legend-State persistence

### Database (`src/database/`)

- **Technology**: sql.js (SQLite WASM)
- **Persistence**: In-memory (IndexedDB persistence planned for future WP)
- **Schema**: Entities table, Connections table, Embeddings table, Clusters table, ClusterMembers table
- **Note**: Migrated from wa-sqlite due to API stability issues (see CHANGELOG)

## Phase Status

- **Phase 0** (Foundation): Complete
  - WP 0.1: Project scaffold
  - WP 0.2: SQLite WASM integration
  - WP 0.3: Data models and adapters
  - WP 0.4: State layer + DevSettings
  - WP 0.5: Cluster schema and types

## Console Debugging

```javascript
// Access state observables in browser console
window.__ATHENA_STATE__      // Main app state
window.__ATHENA_DEV_SETTINGS__ // Feature flags
```
