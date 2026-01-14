# ATHENA Changelog

## [2.1.0] - 2026-01-14

### Added
- **React Flow Canvas**: Graph visualization foundation in Sophia workspace
  - `GraphCanvas.tsx` - React Flow canvas with pan/zoom support
  - Background grid, Controls (zoom +/-/fit), MiniMap
  - Dark theme integration with custom colors
- **Theme Constants**: Centralized color definitions
  - `src/shared/theme/colors.ts` - ATHENA_COLORS constant
  - Connection colors (blue/green/red/amber)
  - Node colors by entity type
  - Surface and UI state colors
- **Canvas Module**: New module structure at `src/modules/canvas/`

### Changed
- `SophiaPage.tsx` - Now shows 60/40 split: canvas + detail panel
- `index.css` - Added React Flow dark theme overrides

### Dependencies
- `@xyflow/react` - React Flow v12+ for graph visualization

### Technical
- Canvas currently renders empty (nodes/edges added in WP 2.2)
- Layout: Canvas takes `flex-1`, detail panel fixed at 400px

## [1.5.0] - 2026-01-14

### Added
- **Create Note**: New note button in sidebar
  - Plus icon button above entity list
  - Creates note with default title "Untitled Note"
  - Auto-selects newly created note
- **Rename Note**: Editable title in EntityDetailHeader
  - Click to edit title inline
  - Saves on blur or Enter key
  - Updates both database and store
- **Delete Note**: Delete button with confirmation
  - Trash icon in header
  - Window confirm dialog before delete
  - Soft delete via adapter, removes from store
  - Clears selection after delete

### Changed
- `Sidebar.tsx` - Added "Notes" header with create button
- `EntityDetailHeader.tsx` - Now has editable title input and delete button

### Fixed
- `entityActions.addNote()` - Fixed bug where new notes weren't added to store
  - Was using optional chaining which doesn't work for new entries

### Technical
- Create uses `noteAdapter.create()` + `entityActions.addNote()` + `uiActions.selectEntity()`
- Rename uses `noteAdapter.update()` + `entityActions.updateNote()`
- Delete uses `noteAdapter.delete()` + `entityActions.removeNote()` + `uiActions.clearSelection()`

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

### Technical
- Editor uses StarterKit for common formatting
- Content stored as Tiptap JSON Block[] format
- Saves to database via `noteAdapter.update()` and updates store via `entityActions.updateNote()`

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

### Technical
- Temporary text extraction from Tiptap Block[] format
- Will be replaced by Tiptap editor in WP 1.4
- Uses `useNote(id)` hook for efficient single note lookup

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

### Technical
- EntityList uses `appState$.initialized` to determine loading state
- Selection managed via `uiActions.selectEntity()` (single selection mode)
- Notes retrieved via `useNotes()` hook from Legend-State store

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
