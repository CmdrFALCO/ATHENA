# Changelog

All notable changes to ATHENA will be documented in this file.

## [1.4.0] - 2026-01-14

### Added
- **Tiptap Editor**: Rich text editing for notes
  - `NoteEditor.tsx` - Main Tiptap editor component with StarterKit
  - `EditorToolbar.tsx` - Formatting toolbar (bold, italic, headings, lists, code, undo/redo)
  - `EditorContainer.tsx` - Wrapper handling auto-save with 500ms debounce
- **Shared Hooks**: New hooks module
  - `useDebouncedCallback()` - Generic debounce hook for callbacks
- **Editor Features**:
  - Placeholder text "Start writing..." when empty
  - Auto-save with "Saving..." indicator
  - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)
  - Toolbar active state indicators
  - Editor remounts on note switch (via key prop)

### Changed
- `EntityDetailContent.tsx` - Now uses EditorContainer instead of text extraction
- `Block` type - Updated to match Tiptap's JSONContent format (recursive content, text, marks)
- `index.css` - Added Tiptap editor and prose dark theme styles

### Dependencies
- `@tiptap/react` - React bindings for Tiptap
- `@tiptap/starter-kit` - Common extensions (bold, italic, headings, lists, etc.)
- `@tiptap/extension-placeholder` - Placeholder text support

## [1.3.0] - 2026-01-14

### Added
- **Entity Detail View**: Display selected note in main content area
  - `EntityDetail.tsx` - Main container, shows empty or note detail
  - `EntityDetailEmpty.tsx` - Empty state with "Select a note" prompt
  - `EntityDetailHeader.tsx` - Title, type badge, created/updated timestamps
  - `EntityDetailContent.tsx` - Content display with text extraction from blocks
- **Date Formatting**: Full date format utility
  - `formatDate()` - Returns formatted date (e.g., "Jan 10, 2026")

### Changed
- `SophiaPage.tsx` - Now renders `EntityDetail` instead of placeholder
- Updated component exports in sophia module

## [1.2.0] - 2026-01-13

### Added
- **Entity List**: Functional note list in sidebar
  - `EntityList.tsx` - Container component with loading/empty states
  - `EntityListItem.tsx` - Single note item with title, icon, timestamp
  - Sorted by `updated_at` descending (most recent first)
  - Single selection support with visual highlight (blue left border)
- **Sophia Module**: First module implementation
  - `src/modules/sophia/` - Knowledge workspace module structure
  - Barrel exports for components
- **Utilities**: Shared utility functions
  - `formatRelativeTime()` - Relative time formatting (e.g., "5 minutes ago", "yesterday")
  - `src/shared/utils/` - Utility module structure
- **Sample Data**: Auto-generated test notes on first run
  - 3 sample notes created when database is empty
  - Enables testing without note creation UI

### Changed
- `Sidebar.tsx` - Replaced placeholder with `EntityList` component
- `useInitializeStore.ts` - Added sample data generation for testing
- Navigation section no longer uses `flex-1` to allow entity list to fill space

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
  - `clusters` table with type, color, confidence, bi-temporal fields
  - `cluster_members` junction table for entity membership with roles
  - Indexes for efficient queries on entity, type, color, validity
- **Cluster Types**: TypeScript definitions for cluster concepts
  - `ClusterType`: concept, sequence, hierarchy, contradiction, dependency
  - `MemberRole`: source, target, participant, hub, evidence, claim
  - `Cluster` and `ClusterMember` interfaces
  - `CreateClusterInput` type for cluster creation
- **Cluster Adapter**: `IClusterAdapter` interface with full CRUD + queries
  - Member management: addMember, removeMember, getMembers
  - Queries: getClustersForEntity, getByType, getByColor, getViolations
  - Bi-temporal support via invalidate method
- **SQLite Implementation**: `SQLiteClusterAdapter` following existing patterns
- **Store Integration**: Cluster state management
  - `useClusters()`, `useCluster(id)`, `useClustersForEntity(entityId)` hooks
  - `clusterActions` for CRUD operations
  - Clusters loaded on app initialization

### Changed
- Updated `AdapterProvider` to include cluster adapter
- Updated `useInitializeStore` to load clusters on init
- App.tsx now initializes SQLiteClusterAdapter

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
