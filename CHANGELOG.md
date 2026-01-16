# ATHENA Changelog

## [4.4.0] - 2026-01-16

### Added
- **Semantic Search**: Vector similarity search using embeddings
  - `ISearchAdapter.semanticSearch()` - New interface method for semantic search
  - `SQLiteSearchAdapter.semanticSearch()` - Embeds query, finds similar notes
  - Returns results with `matchType: 'semantic'` and cosine similarity scores (0-1)
- **SemanticSearchService**: Business logic layer for semantic search
  - `src/modules/search/services/SemanticSearchService.ts` - Wraps adapter
  - Default limit of 10 results, 0.5 similarity threshold
- **useSemanticSearch Hook**: React hook for semantic search state
  - `src/modules/search/hooks/useSemanticSearch.ts`
  - Manages results, isSearching, error state
  - Provides search() and clear() methods

### Changed
- **SQLiteSearchAdapter Constructor**: Now accepts optional dependencies
  - `embeddingAdapter` - For finding similar embeddings
  - `noteAdapter` - For fetching entity details
  - Uses `getAIService()` singleton for query embedding
- **App.tsx**: Updated adapter initialization
  - Creates noteAdapter and embeddingAdapter first
  - Passes them to SQLiteSearchAdapter constructor

### Technical
- **Graceful Degradation**: Returns empty results when:
  - AI not configured (no API key)
  - No active embedding model
  - Embedding index is empty
  - Query embedding fails
- **Snippet Generation**: First 100 chars of content, no highlighting (no exact match to highlight)
- **Score Interpretation**:
  - Keyword search (BM25): Negative scores, more negative = more relevant
  - Semantic search (cosine): 0-1 scores, higher = more similar

### Bug Fixes
- **IndexerService**: Fixed TS1294 error with `erasableSyntaxOnly`
  - Converted parameter properties to explicit property declarations
- **useSuggestionActions**: Fixed TS2322 type mismatch
  - Added `?? null` coalescing for array indexing

### Phase 4 Progress
- WP 4.1: Command Palette ✅
- WP 4.2: FTS Schema ✅
- WP 4.2.1: Custom sql.js with FTS5 ✅
- WP 4.3: Keyword Search ✅
- WP 4.4: Semantic Search ✅
- WP 4.5: Hybrid Search ⏳

## [4.3.0] - 2026-01-16

### Added
- **ISearchAdapter Interface**: Search abstraction layer
  - `src/adapters/ISearchAdapter.ts` - Interface with `keywordSearch()` method
  - `SearchResult` type with entityId, title, type, snippet, score, matchType
  - `SearchOptions` for limit, offset, and entity type filtering
- **SQLiteSearchAdapter**: FTS5 full-text search implementation
  - `src/adapters/sqlite/SQLiteSearchAdapter.ts` - Query FTS5 virtual table
  - BM25 relevance ranking (more negative = more relevant)
  - Snippet extraction with `<mark>` highlighting
  - Query sanitization to prevent FTS5 syntax errors
- **KeywordSearchService**: Business logic layer for search
  - `src/modules/search/services/KeywordSearchService.ts` - Wraps adapter
  - Default limit of 10 results
- **useKeywordSearch Hook**: React hook for search state
  - `src/modules/search/hooks/useKeywordSearch.ts`
  - Manages results, isSearching, error state
  - Provides search() and clear() methods

### Changed
- **Command Palette Upgraded to FTS5**: Now searches content, not just titles
  - `useCommandPalette.ts` - Uses FTS5 search with 300ms debounce
  - Shows recent notes when query empty, search results when typing
  - Returns `CommandPaletteResult` type with optional snippet
- **CommandPalette.tsx**: Updated UI for search results
  - Loading spinner while searching (Loader2 icon)
  - Snippet display below title with highlighted matches
  - "Searching..." state message
- **Adapter Provider**: Added search adapter to context
  - `context.ts` - Added `search: ISearchAdapter` to Adapters interface
  - `hooks.ts` - Added `useSearchAdapter()` hook
  - `App.tsx` - Instantiates `SQLiteSearchAdapter`

### Technical
- **FTS5 Query Sanitization**: Wraps each word in quotes to prevent syntax errors
  - `"hello" "world"` for multi-word queries
  - Escapes internal double quotes
- **BM25 Scoring**: Results sorted by relevance (ascending = most relevant)
- **Debounced Search**: 300ms delay to reduce DB queries while typing
- **Snippet Column Index**: Uses column 2 (content_text) for snippet extraction

### Phase 4 Progress
- WP 4.1: Command Palette ✅
- WP 4.2: FTS Schema ✅
- WP 4.2.1: Custom sql.js with FTS5 ✅
- WP 4.3: Keyword Search ✅
- WP 4.4: Semantic Search ⏳
- WP 4.5: Hybrid Search ⏳

## [4.2.1] - 2026-01-16

### Added
- **Custom sql.js Build with FTS5**: Full-text search upgrade from FTS3 to FTS5
  - `tools/sql.js-custom/` - Custom sql.js build configuration
  - `src/vendor/sql.js/` - Vendored sql.js with ES module export
  - `public/vendor/sql.js/sql-wasm.wasm` - Custom WASM binary
- **FTS5 Features Now Available**:
  - `bm25()` ranking for relevance scoring
  - `highlight()` for marking matches in results
  - `snippet()` for extracting context around matches
  - `UNINDEXED` columns (id stored but not searchable)
  - `porter unicode61` tokenizer for stemming + international text
- **JSON1 Extension**: `json_extract()` and other JSON functions enabled

### Changed
- `src/database/init.ts` - Now uses custom vendor sql.js build
- `src/database/migrations/fts5.ts` - Upgraded from FTS3 to FTS5 schema
- `locateFile` points to `/vendor/sql.js/` instead of CDN

### Technical
- **Custom Build Process**:
  1. Clone sql.js repo to `tools/sql.js-custom/`
  2. Modify Makefile: add `-DSQLITE_ENABLE_FTS5` and `-DSQLITE_ENABLE_JSON1`
  3. Build with Docker: `emscripten/emsdk:3.1.45`
  4. Copy `dist/sql-wasm.js` → `src/vendor/sql.js/`
  5. Copy `dist/sql-wasm.wasm` → `public/vendor/sql.js/`

### Bug Fixes During Implementation
- **ES Module Compatibility**: sql.js custom build uses CommonJS exports
  - Error: "does not provide an export named 'default'"
  - Fix: Added `export default initSqlJs;` at end of sql-wasm.js
- **CommonJS `module` Reference**: Browser throws "module is not defined"
  - Error: `ReferenceError: module is not defined`
  - Fix: Removed CommonJS export block, wrapped `module = undefined;` in try-catch
- **WASM File Location**: Must be served from `public/` for Vite

### File Structure
```
src/vendor/sql.js/
├── index.ts          # Re-export with types
└── sql-wasm.js       # Custom build (ES module patched)

public/vendor/sql.js/
└── sql-wasm.wasm     # Custom WASM binary (~1.3MB with FTS5)

tools/sql.js-custom/  # Build directory (git-ignored)
└── Makefile          # Modified with FTS5+JSON1 flags
```

## [4.2.0] - 2026-01-16

### Added
- **FTS3 Full-Text Search Schema**: SQLite full-text search infrastructure
  - `src/database/migrations/fts5.ts` - FTS3 setup, triggers, and migration functions
  - `src/database/migrations/index.ts` - Barrel export for migrations
  - `entities_fts` virtual table for searchable title and content
  - Sync triggers for INSERT, UPDATE, DELETE, and soft-delete operations
- **Text Extraction Utility**: Extract plain text from Tiptap JSON
  - `src/shared/utils/extractTextFromTiptap.ts` - Recursive text extractor
  - Handles nested Tiptap blocks, formatting marks, JSON strings
  - Used for FTS indexing of rich text content
- **Content Text Column**: `content_text` column on entities table
  - Stores extracted plain text for FTS indexing
  - Automatically populated on note create/update

### Changed
- `src/database/init.ts` - Calls FTS3 setup after schema creation
- `src/adapters/sqlite/SQLiteNoteAdapter.ts` - Extracts content_text on create/update
- `src/shared/utils/index.ts` - Exports extractTextFromTiptap

### Technical
- **FTS3 vs FTS5**: Using FTS3 instead of FTS5 because sql.js default build doesn't include FTS5
  - FTS3 is compiled into the standard sql.js WASM
  - FTS5 requires custom compilation with `-DSQLITE_ENABLE_FTS5` flag
  - FTS3 provides basic full-text search (no BM25 ranking, no UNINDEXED columns)
- Triggers handle bi-temporal soft deletes (remove from FTS when `invalid_at` is set)
- Migration is idempotent (safe to run multiple times)

### Bug Fixes During Implementation
- **"no such module: fts5"**: sql.js CDN and npm builds don't include FTS5
  - Attempted fixes: jsDelivr CDN, local WASM import via Vite
  - Solution: Use FTS3 which IS included in standard sql.js build
- **Version mismatch error**: "z is not a function" when WASM version didn't match npm package
  - Ensure CDN version matches installed sql.js version (1.13.0)

### Phase 4 Progress
- WP 4.1: Command Palette ✅
- WP 4.2: FTS Schema ✅
- WP 4.3: Keyword Search Service ⏳
- WP 4.4: Vector Search Integration ⏳

## [4.1.0] - 2026-01-16

### Added
- **Command Palette (Cmd+K)**: Quick-jump search overlay for fast navigation
  - `src/modules/search/` - New search module
  - `CommandPalette.tsx` - Modal overlay with search input and results
  - `useCommandPalette.ts` - State management hook for palette
- **Keyboard Navigation**:
  - `Cmd+K` / `Ctrl+K` to open palette
  - `Escape` to close
  - `↑` / `↓` to navigate results
  - `Enter` to select and navigate to entity
- **Search Features**:
  - Case-insensitive title filtering
  - Recent notes shown when query is empty (last 10)
  - Entity type icons (note, plan, document)
  - Relative date display (Today, Yesterday, X days ago)

### Changed
- `src/store/state.ts` - Added `commandPaletteOpen` to UIState
- `src/store/hooks.ts` - Added `useCommandPaletteOpen` hook and palette actions
- `src/app/layout/AppLayout.tsx` - Integrated CommandPalette component

### Technical
- React portal rendering to document.body for z-index handling
- Scroll-into-view for keyboard navigation
- Click-outside to close via backdrop

## [3.6.0] - 2026-01-15

### Added
- **Accept/Reject UI for Green Suggestions**: Human-in-the-loop decision point for AI suggestions
  - `SuggestionPopover.tsx` - Popover with Accept/Dismiss buttons
  - `useSuggestionActions.ts` - Hook for accept (persist) and dismiss logic
  - Click green edge label → popover appears with similarity score
  - Accept → Creates blue persisted connection in SQLite, removes suggestion
  - Dismiss → Removes suggestion from state
- **ConnectionEdge Enhancement**: Updated to handle suggestion interactions
  - Added `sourceId`/`targetId` to edge data for accept flow
  - `nodrag nopan` CSS classes to prevent React Flow click interception
  - Inline popover rendering below edge label

### Changed
- `useSuggestedEdges.ts` - Pass source/target IDs to edge data
- `hooks/index.ts` (AI) - Export new `useSuggestionActions` hook
- `ai/index.ts` - Export new hook

### Technical
- React Flow click handling: `nodrag nopan` classes + `onMouseDown` stopPropagation
- Accept flow: connectionAdapter.create() → connectionActions.addConnection() → suggestionActions.removeSuggestion()
- Dismiss flow: suggestionActions.removeSuggestion()
- Duplicate connection check before accepting

### Phase 3 Complete
- WP 3.1: AI backend interface ✅
- WP 3.2: Embedding storage ✅
- WP 3.3: Background indexer ✅
- WP 3.4: Similarity query ✅
- WP 3.5: Green suggestions ✅
- WP 3.6: Accept/reject UI ✅

## [2.5.0] - 2026-01-15

### Added
- **Connection Inspector**: Panel for viewing and editing connection details
  - `ConnectionInspector.tsx` - Inspector panel showing source/target, label, metadata
  - `useSelectedConnection.ts` - Hook for managing selected connection state
  - Click edge → opens inspector in top-right corner
  - Displays: source note, target note, connection type, creator, created date
  - Editable label field (saves on blur/Enter)
  - Delete button with confirmation dialog
  - Confidence percentage shown for AI-suggested connections
- **Connection Update**: Store action for updating connection fields
  - `connectionActions.updateConnection()` - Update label, confidence, etc.

### Changed
- `GraphCanvas.tsx` - Added edge click handling, pane click to dismiss inspector
- `index.css` - Added slide-in animation for inspector panel

### Technical
- Inspector uses direct store selector for reactive updates
- Color mapping: blue→Explicit, green→AI Suggested, red→Validation Error, amber→Validation Warning
- Inspector closes on: pane click, node click, X button, or connection delete
- Data flow: onEdgeClick → selectConnection → ConnectionInspector renders

### Phase 2 Complete
- WP 2.1: React Flow setup ✅
- WP 2.2: Entity nodes ✅
- WP 2.3: Node positioning ✅
- WP 2.4: Blue connections ✅
- WP 2.5: Connection inspector ✅

## [2.4.0] - 2026-01-15

### Added
- **Blue Connections**: Create explicit connections by dragging between node handles
  - `ConnectionEdge.tsx` - Custom edge component with color-coded styling
  - `useConnectionsAsEdges.ts` - Converts store connections to React Flow edges
  - `useConnectionHandlers.ts` - Handles connection creation and deletion
- **Connection Features**:
  - Drag from source handle (bottom) to target handle (top) to create connection
  - Blue bezier curve for explicit user connections
  - Optional label display on edge center
  - Edge selection with visual feedback (thicker stroke)
  - Delete connections with backspace/delete key

### Changed
- `GraphCanvas.tsx` - Added edge types, onConnect, onEdgesDelete handlers
- `index.css` - Added edge hover and selection styles

### Fixed
- Infinite loop when syncing React Flow edges with store
  - Same root cause as WP 2.2: `useEffect` triggering on every render due to array reference changes
  - Solution: Track edge IDs with ref, only sync when edges actually added/removed

### Technical
- Connections persist to SQLite via `connectionAdapter.create()`
- Store sync via `connectionActions.addConnection()`
- Self-connections prevented
- Color mapping: blue→explicit, green→semantic, red→error, amber→warning
- Data flow: onConnect → connectionAdapter.create → connectionActions.addConnection → useConnectionsAsEdges → render

## [2.3.0] - 2026-01-15

### Added
- **Node Positioning**: Drag-to-reposition nodes with persistent storage
  - `useNodePositionSync.ts` - Hook to persist node positions to SQLite
  - `onNodeDragStop` handler saves position on drag end
  - Snap-to-grid (20px) for cleaner layouts
- **Smart Default Positions**: New notes appear offset from existing nodes
  - Calculates `position_x` based on rightmost existing node + 250px
  - Prevents notes from stacking on top of each other

### Changed
- `GraphCanvas.tsx` - Added drag handling, snap-to-grid, position persistence
- `Sidebar.tsx` - Note creation calculates sensible default position

### Technical
- Positions saved on drag end (not during) to minimize DB writes
- Positions rounded to integers for cleaner storage
- Data flow on drag: onNodeDragStop → saveNodePosition → noteAdapter.update + entityActions.updateNote
- Position preservation during React Flow re-renders via Map lookup

## [2.2.0] - 2026-01-14

### Added
- **Entity Nodes**: Custom React Flow node component for displaying entities
  - `EntityNode.tsx` - Node with type badge, icon, and title
  - Color-coded left border based on entity type (note=blue, plan=amber, document=purple)
  - Selection highlight with amber ring
  - Connection handles (hidden by default, shown on hover)
- **useNotesAsNodes Hook**: Converts store notes to React Flow nodes
  - Auto-generates grid layout positions if not set
  - Click node → selects in store → updates detail panel

### Changed
- `GraphCanvas.tsx` - Now renders entity nodes from store with ID-based sync
- `EntityNode.tsx` - Subscribes directly to store for selection state
- `index.css` - Added node focus and handle hover styles

### Fixed
- Infinite loop when syncing React Flow nodes with store
  - Root cause: `useEffect` triggering on every render due to array reference changes
  - Solution: `EntityNode` subscribes directly to `useSelectedEntityIds()` instead of receiving selection via props
  - `GraphCanvas` only syncs when node IDs actually change (add/remove)

### Technical
- Node positions use `position_x`/`position_y` from entity or fall back to auto-grid
- Selection state handled per-node via direct store subscription (avoids prop drilling and re-render loops)
- Data flow: Store → useNotesAsNodes → GraphCanvas → EntityNode (subscribes to selection) → onNodeClick → uiActions.selectEntity

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
