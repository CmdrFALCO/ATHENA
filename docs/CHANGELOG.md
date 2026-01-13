# ATHENA Changelog

## [1.1.0] - 2026-01-13

### Added
- **App Shell**: Complete layout structure with Header, Sidebar, and main content area
  - `AppLayout.tsx` - Main layout wrapper with responsive design
  - `Header.tsx` - Top header bar with app title and sidebar toggle
  - `Sidebar.tsx` - Collapsible navigation (240px expanded, 64px collapsed)
  - `StoreInitializer.tsx` - Store initialization wrapper component
- **TanStack Router**: Client-side routing with manual route tree
  - Routes: `/sophia`, `/pronoia`, `/ergane`
  - Index route (`/`) redirects to `/sophia`
  - Type-safe routing with TypeScript registration
- **Placeholder Pages**: Initial aspect pages with icons
  - `SophiaPage.tsx` - Knowledge workspace (Bird icon)
  - `PronoiaPage.tsx` - Planning workspace (Swords icon)
  - `ErganePage.tsx` - Creation workspace (Hammer icon)
- **Athena Color Palette**: Dark theme colors in Tailwind config
  - `athena-bg`, `athena-surface`, `athena-border`, `athena-text`, `athena-muted`
- **Dependencies**: `@tanstack/react-router`, `lucide-react`

### Changed
- `App.tsx` - Now renders `RouterProvider` instead of test UI
- `main.tsx` - Structure unchanged (App handles adapter initialization)

### Known Issues
Pre-existing lint errors to address:
- `src/adapters/sqlite/SQLiteClusterAdapter.ts:190` - `'_reason' is defined but never used`
- `src/store/hooks.ts:124,150,205` - `'_' is assigned a value but never used`

## [0.5.0] - 2026-01-13

### Added
- **Cluster Schema**: N-way relationship support via clusters and cluster_members tables
- **Cluster Types**: TypeScript definitions for cluster concepts
- **Cluster Adapter**: `IClusterAdapter` interface with full CRUD + queries
- **SQLite Implementation**: `SQLiteClusterAdapter` following existing patterns
- **Store Integration**: Cluster state management hooks and actions

### Changed
- Updated `AdapterProvider` to include cluster adapter
- Updated `useInitializeStore` to load clusters on init

## [0.4.0] - 2026-01-13

### Added
- **State Management**: Legend-State for reactive state management
- **DevSettings Panel**: Feature flag management UI (Ctrl+Shift+D)
- **Store Initialization**: `useInitializeStore()` hook

### Changed
- **SQLite Library Migration**: Replaced wa-sqlite with sql.js
  - wa-sqlite exhibited unstable behavior in browser environment
  - sql.js provides stable synchronous API

## [0.3.0] - 2026-01-13

### Added
- TypeScript types for Entity, Connection, and Embedding models
- SQLite schema with entities, connections, and embeddings tables
- Adapter pattern interfaces (INoteAdapter, IConnectionAdapter, IEmbeddingAdapter)
- SQLite adapter implementations for all data types
- AdapterProvider React context for dependency injection
- Path alias `@/` for cleaner imports
- Bi-temporal data model (valid_at/invalid_at for soft deletes)

### Changed
- Updated App.tsx with adapter test panel
- Enhanced database init to run schema on startup
- Vite config updated with path alias resolution

### Technical
- Adapter pattern enables future backend swapping (e.g., remote sync)
- Soft delete via invalidation supports data recovery
- Cosine similarity for embeddings computed in JavaScript

## [0.2.0] - 2026-01-13

### Added
- SQLite WASM integration using wa-sqlite
- Database module with IndexedDB persistence (IDBBatchAtomicVFS)
- Database initialization with singleton pattern
- Test component showing database status in UI

### Changed
- Updated App.tsx with database test component
- Added Vite config for WASM loading and COOP/COEP headers

### Technical
- Using wa-sqlite-async.mjs for async database operations
- IndexedDB storage via IDBBatchAtomicVFS for cross-session persistence

## [0.1.0] - 2026-01-13

### Added
- Project scaffold with Vite + React 19 + TypeScript
- Tailwind CSS configuration with dark mode
- Folder structure for all planned modules
- Documentation scaffolding (ARCHITECTURE, DECISIONS, LESSONS_LEARNED)
