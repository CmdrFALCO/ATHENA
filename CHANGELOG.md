# Changelog

All notable changes to ATHENA will be documented in this file.

## [0.4.0] - 2026-01-13

### Added
- **State Management**: Integrated Legend-State for reactive state management
  - `appState$` observable for UI state, entities, and connections
  - `devSettings$` observable for feature flags
  - React hooks: `useNotes()`, `useConnections()`, `useFeatureFlag()`, etc.
  - Action creators: `uiActions`, `entityActions`, `connectionActions`
- **DevSettings Panel**: Feature flag management UI
  - Toggle with Ctrl+Shift+D keyboard shortcut
  - Feature flags for AI, Search, Validation phases
  - Debug flags for state and adapter logging
  - Settings persist to localStorage
- **Store Initialization**: `useInitializeStore()` hook loads entities from SQLite on app start

### Changed
- App.tsx updated to use Legend-State hooks instead of local React state
- UI now reflects entities loaded from SQLite via reactive state
- **SQLite Library Migration**: Replaced wa-sqlite with sql.js
  - wa-sqlite exhibited unstable behavior in browser environment:
    - IDBBatchAtomicVFS failed with "unable to open database file"
    - MemoryAsyncVFS caused "RuntimeError: unreachable" WASM errors
    - Sync module returned Promises unexpectedly, causing invalid database handles
    - Resulted in persistent "SQLiteError: out of memory" errors
  - sql.js provides a stable, well-tested synchronous API
  - Database currently runs in-memory; IndexedDB persistence planned for future WP

## [0.3.0] - 2026-01-13

### Added
- **Data Models**: TypeScript types for Entity, Note, Connection, Embedding
- **Adapter Pattern**: Interface-based data access layer
  - `INoteAdapter`, `IConnectionAdapter`, `IEmbeddingAdapter` interfaces
  - SQLite implementations for all adapters
- **React Context**: `AdapterProvider` and hooks for adapter access
- **Bi-temporal Support**: `valid_at` and `invalid_at` fields for temporal queries

## [0.2.0] - 2026-01-13

### Added
- **SQLite WASM**: Integrated wa-sqlite with IndexedDB persistence (later replaced with sql.js in v0.4.0)
- **Database Schema**: Tables for entities, connections, embeddings
- **Database Initialization**: Async initialization with error handling

## [0.1.0] - 2026-01-13

### Added
- Initial project scaffold with Vite + React + TypeScript
- Tailwind CSS configuration
- ESLint configuration
- Basic App component structure
