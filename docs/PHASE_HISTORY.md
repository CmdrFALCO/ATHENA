# Phase History

This document archives all completed phases, work packages, bug fixes, and known issues.

---

## Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Foundation | ✅ Complete | Project scaffold, database, data models, state layer |
| 1 | Core UI | ✅ Complete | App shell, routing, entity views, rich text editor |
| 2 | Graph Visualization | ✅ Complete | React Flow canvas, nodes, connections, inspector |
| 3 | AI Layer | ✅ Complete | AI backends, embeddings, indexing, similarity, accept/reject |
| 4 | Search | ✅ Complete | Command palette, FTS5, semantic search, hybrid RRF, faceted search |
| 5 | Validation | ✅ Complete | CPN validation engine |
| 6 | Resources | ✅ Complete | Resource management, extraction pipeline, document storage |
| 7 | AI Chat | ✅ Complete | Chat panel, GraphRAG context, proposals, spatial awareness |
| 8 | Advanced Features | 🔄 In Progress | Entity resolution, document tree structure |

---

## Phase 0: Foundation

**Status:** ✅ Complete

### WP 0.1: Project Scaffold
- Vite + React + TypeScript setup
- ESLint 9+ flat config
- Tailwind CSS with dark theme
- Path alias `@/` configured

### WP 0.2: SQLite WASM Integration
- sql.js WASM loading
- Database singleton pattern
- Schema migrations
- In-memory storage (IndexedDB persistence planned)

### WP 0.3: Data Models and Adapters
- Entity types (Note, Plan, Document)
- Connection types and colors
- Adapter interfaces (INoteAdapter, IConnectionAdapter)
- SQLite implementations
- AdapterProvider for dependency injection

### WP 0.4: State Layer + DevSettings
- Legend-State observable store
- React hooks for state access
- Entity, connection actions
- DevSettings feature flags
- Console debugging (`__ATHENA_STATE__`)

### WP 0.5: Cluster Schema and Types
- Cluster types (concept, sequence, hierarchy, contradiction, dependency)
- Member roles (source, target, participant, hub, evidence, claim)
- IClusterAdapter interface
- SQLiteClusterAdapter implementation
- Junction table pattern for N-way relationships

---

## Phase 1: Core UI

**Status:** ✅ Complete

### WP 1.1: App Shell + Routing
- AppLayout component (Header, Sidebar, content)
- TanStack Router setup
- Route tree (/, /sophia, /pronoia, /ergane)
- Collapsible sidebar (240px ↔ 64px)
- Dark theme styling

### WP 1.2: Entity List in Sidebar
- EntityList component
- EntityListItem with title, icon, timestamp
- Loading and empty states
- Selection support
- Sorted by `updated_at` descending

### WP 1.3: Entity Detail View
- EntityDetail component
- EntityDetailEmpty state
- EntityDetailHeader with title, type badge
- EntityDetailContent display
- Selection sync with sidebar

### WP 1.4: Tiptap Rich Text Editor
- Tiptap integration with React
- EditorContainer with auto-save (500ms debounce)
- NoteEditor component
- EditorToolbar (bold, italic, headings, lists, code, undo/redo)
- useDebouncedCallback hook

### WP 1.5: Entity CRUD
- Create: Plus button in sidebar header
- Rename: Editable title in EntityDetailHeader
- Delete: Trash button with confirmation dialog
- Persistence through adapters + state sync

---

## Phase 2: Graph Visualization

**Status:** ✅ Complete

### WP 2.1: React Flow Setup
- GraphCanvas component with React Flow
- Dark themed canvas (`#1a1a1a`)
- Dot grid background
- Pan and zoom controls
- MiniMap for navigation
- ATHENA_COLORS theme constants

### WP 2.2: Entity Nodes on Canvas
- EntityNode custom component
- Type badges with icons
- Color-coded by entity type
- Selection sync with store
- useNotesAsNodes hook

### WP 2.3: Node Positioning
- Drag-to-reposition nodes
- useNodePositionSync hook
- Persistent storage to SQLite
- Snap-to-grid (20px)
- Position updates in store

### WP 2.4: Blue Connections
- ConnectionEdge custom component
- Drag between handles to connect
- useConnectionsAsEdges hook
- useConnectionHandlers hook
- Delete with backspace/delete key
- Color-coded edge styling

### WP 2.5: Connection Inspector
- ConnectionInspector panel
- Click edge to open inspector
- Editable connection labels
- Auto-save on label change
- useSelectedConnection hook
- Connection metadata display

---

## Phase 3: AI Layer

**Status:** ✅ Complete

### WP 3.1: AI Backend Interface ✅
- SecureStorage service (Web Crypto API + IndexedDB)
  - AES-GCM encryption
  - PBKDF2 key derivation (100,000 iterations)
  - Password protection mode
- AI types and interfaces
  - IAIBackend interface
  - AIProviderType enum
  - EmbeddingResult, GenerateResult types
- GeminiBackend implementation
  - Embedding with text-embedding-004
  - Text generation with gemini-pro
- AIService orchestrator
  - Backend management
  - Configuration handling
- AIContext React context
  - AIProvider component
  - useAI, useAIStatus hooks
- DevSettings AI configuration UI
  - Provider selection
  - API key management
  - Test connection button
  - Model selection

### WP 3.2: Embedding Storage ✅
- Enhanced IEmbeddingAdapter interface
  - store, getForEntity, getAllForEntity
  - findSimilar with cosine similarity
  - deleteForEntity, deleteByModel
  - hasEmbedding, getCount
- SQLiteEmbeddingAdapter implementation
  - Vector storage as JSON
  - JavaScript cosine similarity calculation
- AIService integration
  - embedAndStore method
  - findSimilarNotes method
  - handleModelChange for model switching
- useEmbeddings hook
  - embedNote, findSimilar
  - getEmbeddingStatus
  - deleteEmbedding, getEmbeddingCount
- Updated types
  - EmbeddingRecord (primary)
  - SimilarityResult

### WP 3.3: Background Indexer ✅
- IndexerService
  - Three trigger modes: on-save, on-demand, continuous
  - Queue management
  - Batch processing for continuous mode
  - Retry logic for failed embeddings
- IndexerConfig
  - Configurable batch size, delays, debounce
- IndexerStatus for UI display
  - isRunning, mode, queue, processed, failed
  - lastIndexedAt, currentEntityId
- useIndexer hook
  - onNoteSaved for on-save mode
  - indexNote, indexAll for manual control
  - pause, resume, stop controls
- useIdleDetection hook
  - User activity monitoring
  - Configurable idle threshold
  - onIdle, onActive callbacks
- Integration points
  - EditorContainer: auto-embed on save
  - AppLayout: pause/resume on activity
  - DevSettings: IndexerStatusSection UI

### WP 3.4: Similarity Query ✅
- useSimilarNotes hook
  - findSimilar, refresh, clear methods
  - similarNotes array with similarity scores
  - Loading and error states
  - hasEmbedding flag
- SimilarNote type
  - note reference
  - similarity (0-1)
  - similarityPercent (0-100)
- SimilarNotesPanel component
  - Sidebar panel for similar notes
  - Color-coded similarity percentages
    - 90%+ = Green
    - 70-89% = Yellow
  - Click to navigate to note
- SimilarNotesButton component
  - Toggle button for panel visibility
- EntityDetail integration
  - Collapsible similar notes sidebar
  - Actions slot in header for extensibility
- EntityDetailHeader enhancement
  - actions prop for extensibility
  - Renders SimilarNotesButton

### WP 3.5: Green Suggestions ✅
- SuggestionService
  - Generates connection suggestions from embeddings
  - Uses AIService.findSimilarNotes() for similarity
  - Excludes existing explicit connections
  - Configurable minSimilarity and maxSuggestions
- useSuggestions hook
  - generateForNote, generateForCanvas methods
  - dismissSuggestion, clearSuggestions
  - Loading and error states
- useSuggestedEdges hook
  - Converts suggestions to React Flow edges
  - Green dashed styling with similarity labels
- SuggestedConnection type in store
  - id, sourceId, targetId, similarity
  - status: 'pending' | 'dismissed'
  - Ephemeral (not persisted to DB)
- ConnectionEdge enhancement
  - isSuggested flag for green styling
  - Dashed stroke (8,4), 75% opacity
  - Similarity label display
- GraphCanvas integration
  - Generates suggestions on note selection
  - Combines explicit + suggested edges
  - Clears suggestions on deselection
- Global Indexer Events
  - indexerActions.noteIndexed() broadcast
  - useLastIndexedNoteId() subscription
  - Fixes multi-instance callback issue
- EntityDetailHeader update
  - Triggers re-indexing on title change
  - Suggestions update when title changes
- EditorContainer update
  - Already triggers indexer on content change
  - Suggestions update when content changes

### WP 3.6: Accept/Reject UI ✅
- SuggestionPopover component
  - Accept/Dismiss buttons
  - Similarity percentage display
  - Loading state for accept action
- useSuggestionActions hook
  - acceptSuggestion: persist to SQLite → add to store → remove suggestion
  - dismissSuggestion: remove from state
  - Duplicate connection detection
- ConnectionEdge enhancement
  - Added sourceId/targetId to edge data
  - Click green label → shows popover
  - `nodrag nopan` classes for React Flow click handling
- useSuggestedEdges update
  - Pass source/target IDs to edge data
- Module exports
  - Export useSuggestionActions from AI module

---

## Phase 4: Search

**Status:** ✅ Complete — **Usability Milestone Reached**

### WP 4.1: Command Palette ✅
- CommandPalette component
  - Cmd+K / Ctrl+K to open globally
  - Modal overlay with search input
  - Entity type icons (note, plan, document)
  - Relative date display (Today, Yesterday, X days ago)
- useCommandPalette hook
  - Query state and filtering
  - Keyboard navigation (↑/↓/Enter/Escape)
  - Entity selection via uiActions.selectEntity()
- Keyboard behavior
  - Escape to close
  - Arrow keys to navigate results
  - Enter to select and navigate
  - Click outside to close
- Search features
  - Case-insensitive title filtering
  - Recent notes shown when query is empty (last 10)
  - Max 10 results displayed
- Store updates
  - Added commandPaletteOpen to UIState
  - Added useCommandPaletteOpen hook
  - Added palette actions (open/close/toggle)
- AppLayout integration
  - CommandPalette rendered at root level
  - Uses React portal for z-index handling

### WP 4.2: FTS5 Full-Text Search Schema ✅
- Custom sql.js build with FTS5+JSON1 extensions
  - `tools/sql.js-custom/` - Build configuration
  - `src/vendor/sql.js/` - Vendored ES module patched build
  - `public/vendor/sql.js/sql-wasm.wasm` - Custom WASM binary
- FTS5 virtual table `entities_fts`
  - UNINDEXED id column
  - Title and content_text searchable columns
  - Porter unicode61 tokenizer for stemming
- Sync triggers for INSERT, UPDATE, DELETE
- `content_text` column for plain text extraction

### WP 4.3: Keyword Search ✅
- ISearchAdapter interface with `keywordSearch()` method
- SQLiteSearchAdapter implementation
  - FTS5 MATCH queries with BM25 ranking
  - Query sanitization (quote wrapping)
  - Snippet extraction with `<mark>` highlighting
- KeywordSearchService business logic layer
- useKeywordSearch React hook
- Command Palette upgraded to use FTS5 search

### WP 4.4: Semantic Search ✅
- ISearchAdapter.semanticSearch() method
- SQLiteSearchAdapter.semanticSearch() implementation
  - Embeds query via AIService
  - Finds similar via embeddingAdapter.findSimilar()
  - Maps to SearchResult with cosine similarity scores
- SemanticSearchService business logic layer
- useSemanticSearch React hook
- Graceful degradation when AI unavailable

### WP 4.5: Hybrid Search with RRF ✅
- ISearchAdapter.hybridSearch() method
- HybridSearchService with Reciprocal Rank Fusion
  - `applyRRF()` function for merging results
  - k=60 smoothing constant, configurable weights
  - Entities in BOTH result sets rank higher
- useHybridSearch React hook
- Command Palette uses hybrid search by default
- Match type badges (purple=hybrid, blue=keyword, green=semantic)
- DevSettings search configuration (RRF parameters)

### WP 4.6: Faceted Search Panel ✅
- SearchPanel component (Cmd+Shift+K)
  - Full-screen modal with facet sidebar + results
  - Debounced hybrid search (300ms)
  - "Show on Canvas" action per result
- FacetSidebar component
  - Type facet: filter by note/plan/document
  - Created facet: filter by Today/This Week/This Month/Older
  - Checkbox UI with counts
  - "Clear all" button
- FacetService
  - extractFacets() - count values from results
  - applyFacets() - filter with OR within / AND across
  - Date bucket calculation for created facet
- SearchResults component
  - Match type badges
  - Snippet display with highlighting
  - Score display
- useSearchPanel hook with keyboard shortcuts
- SearchResult extended with createdAt/updatedAt
- Header search icon enabled

---

## Phase 5: Validation

**Status:** ✅ Complete

### WP 5.1: CPN Validation Engine ✅
- Constraint-based validation framework
- CPN (Colored Petri Net) validation rules
- Entity validation with constraint violations
- Real-time validation feedback

---

## Phase 6: Resources

**Status:** ✅ Complete

### WP 6.1: Resource Management ✅
- Resource types: PDF, DOCX, XLSX, Markdown, Image, URL
- File upload with drag-and-drop
- Blob storage for file resources
- URL reference and AI extraction modes
- Resource detail panel with metadata display

### WP 6.2: Extraction Pipeline ✅
- Browser-based text extraction (BrowserExtractionService)
- AI-powered extraction for complex formats (AIExtractionService)
- Post-extraction pipeline (embeddings + structure)
- Extraction status tracking (pending → complete/failed/skipped)

### WP 6.3: Resource Search & Embeddings ✅
- Resource embedding generation via indexer
- Similarity search across resources
- FTS integration for resource text content

---

## Phase 7: AI Chat

**Status:** ✅ Complete

> **Full documentation:** [docs/modules/CHAT.md](modules/CHAT.md)

### WP 7.1: Chat UI & State ✅
- Slide-over chat panel with thread management
- IndexedDB persistence for chat history
- Legend-State observable chat state

### WP 7.2: GraphRAG Context Builder ✅
- Multi-strategy context gathering
- Selected nodes, similarity search, graph traversal
- Deduplication and relevance scoring

### WP 7.3: Conversational Generation ✅
- AI streaming responses with real-time display
- System prompt with graph context injection
- ChatService orchestrator

### WP 7.4: Knowledge Extraction Parser ✅
- AI-powered proposal extraction from conversation
- Self-correction loop for parsing failures
- Node and edge proposal types

### WP 7.5: Proposal Cards UI ✅
- Accept/reject workflow for AI suggestions
- NodeProposalCard and EdgeProposalCard components
- Edge dependency tracking (proposed → accepted nodes)
- ProposalAcceptService for persisting accepted proposals

### WP 7.6: Spatial Awareness ✅
- @mention autocomplete with fuzzy search
- Canvas selection → chat context bridge
- Context chips UI for managing referenced nodes
- Thread-level context persistence

---

## Phase 8: Advanced Features

**Status:** 🔄 In Progress

### WP 8.1: Entity Resolution ✅
- Merge candidate detection via similarity
- Merge candidate UI with accept/dismiss workflow
- `merge_candidates` table with status tracking

### WP 8.2: Document Tree Structure ✅
- AI-powered hierarchical structure extraction for PDFs
- DocumentTree type (title, node_id, pages, summary, children)
- DocumentTreeExtractor service with validation
- DocumentReasoningStrategy for context building
- DocumentOutline UI component (collapsible tree view)
- Database migration: `structure` column on resources table
- DevSettings: `resources.pdf` configuration

---

## Bug Fixes

### Post WP 3.5

| File | Issue | Fix |
|------|-------|-----|
| `GraphCanvas.tsx` | Suggestions not updating when selected note re-indexed | Switched from instance callback to global Legend-State subscription |
| `IndexerService.ts` | Multi-instance callback issue (each hook gets own service) | Added `indexerActions.noteIndexed()` broadcast via Legend-State |
| `EntityDetailHeader.tsx` | Title changes not triggering re-indexing | Added `indexer.onNoteSaved()` call in `handleTitleSave` |

### Post WP 3.4

| File | Issue | Fix |
|------|-------|-----|
| `useIndexer.ts` | Embedding adapter not connected to AIService before indexing | Connected adapter before indexing |
| `useSimilarNotes.ts` | Refresh button not working due to stale state | Used ref instead of state for currentNoteId |
| `GraphCanvas.tsx` | Node titles not syncing when note title changes | Added data sync effect with proper change detection |
| `AppLayout.tsx` | ReactFlow zoom scroll not working | Changed main `overflow-auto` to `overflow-hidden` |
| `SophiaPage.tsx` | Zoom handling issues | Added `h-full overflow-hidden` to GraphCanvas container |

---

## Known Issues

### Pre-existing Lint Errors

| File | Line | Error |
|------|------|-------|
| `src/adapters/sqlite/SQLiteClusterAdapter.ts` | 190 | `'_reason' is defined but never used` |
| `src/store/hooks.ts` | 124 | `'_' is assigned a value but never used` |
| `src/store/hooks.ts` | 150 | `'_' is assigned a value but never used` |
| `src/store/hooks.ts` | 205 | `'_' is assigned a value but never used` |

---

## Database Schema

### Tables

| Table | Purpose | Added |
|-------|---------|-------|
| `entities` | Notes, plans, documents | WP 0.3 |
| `connections` | Entity relationships | WP 0.3 |
| `embeddings` | Vector embeddings | WP 0.5, enhanced 3.2 |
| `clusters` | N-way groupings | WP 0.5 |
| `cluster_members` | Cluster membership | WP 0.5 |
| `schema_meta` | Migration tracking | WP 0.2 |
| `resources` | Uploaded files, URLs, extracted content | WP 6.1 |
| `merge_candidates` | Entity resolution candidates | WP 8.1 |

### Notable Column Additions

| Table | Column | Purpose | Added |
|-------|--------|---------|-------|
| `resources` | `structure` | Document tree JSON (hierarchical ToC) | WP 8.2 |

### Indexes

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_entities_type` | entities | Filter by entity type |
| `idx_entities_valid` | entities | Bi-temporal queries |
| `idx_connections_source` | connections | Graph traversal |
| `idx_connections_target` | connections | Graph traversal |
| `idx_connections_color` | connections | Tri-color filtering |
| `idx_embeddings_entity` | embeddings | Embedding lookup |
| `idx_cluster_members_entity` | cluster_members | Cluster membership lookup |
| `idx_clusters_type` | clusters | Filter by cluster type |
| `idx_clusters_color` | clusters | Filter by cluster color |
| `idx_clusters_valid` | clusters | Bi-temporal queries |

---

## Coming Next

| WP | What's Added |
|----|--------------|
| **8.3+** | Additional Phase 8 advanced features |
| **Future** | Plans and documents (Pronoia, Ergane modules) |
| **Future** | Additional AI backends (Ollama, Anthropic, OpenAI, Mistral) |

---

## Related Documentation

- [Codebase Map](../CODEBASE_MAP.md) - Navigation hub
- [Architecture](ARCHITECTURE.md) - System design
- [Decisions](DECISIONS.md) - ADRs
- [Lessons Learned](LESSONS_LEARNED.md) - Gotchas
