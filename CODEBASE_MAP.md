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
| **Last WP Completed** | 7.6 (Spatial Awareness) |
| **Last Updated** | January 2026 |
| **Phase** | 7 (AI Chat - Knowledge Capture Interface) **COMPLETE** |
| **Milestone** | Phase 7 - Conversational Knowledge Capture |

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
│   │   ├── secureStorage/        # Encrypted storage
│   │   └── blobStorage/          # ✅ IndexedDB file storage (WP 6.2)
│   ├── modules/
│   │   ├── canvas/               # React Flow graph
│   │   ├── sophia/               # Knowledge workspace
│   │   ├── ai/                   # AI backend
│   │   ├── chat/                 # ✅ Chat panel with thread management (WP 7.1)
│   │   ├── pronoia/              # ⏳ Plans, decisions
│   │   ├── ergane/               # ⏳ Documents, export
│   │   ├── validation/           # ✅ Types, Engine, Rules, Service, Store, Hooks, Components
│   │   ├── search/               # ✅ FTS5 keyword + semantic + hybrid search (RRF) + Command Palette + Faceted Search Panel
│   │   └── resources/            # ✅ Browser + AI extraction (PDF, images) + FTS + Embeddings
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
| Chat | `src/modules/chat/` | [docs/modules/CHAT.md](docs/modules/CHAT.md) | ✅ |
| App Shell | `src/app/` | [docs/modules/APP.md](docs/modules/APP.md) | ✅ |
| Secure Storage | `src/services/secureStorage/` | [docs/modules/AI.md](docs/modules/AI.md) | ✅ |
| Blob Storage | `src/services/blobStorage/` | — | ✅ |
| Theme | `src/shared/theme/` | [docs/modules/APP.md](docs/modules/APP.md) | ✅ |
| Search | `src/modules/search/` | — | ✅ |
| Validation | `src/modules/validation/` | [docs/modules/VALIDATION.md](docs/modules/VALIDATION.md) | ✅ |
| Resources | `src/modules/resources/` | — | ✅ |
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
| Violation Display | `src/modules/canvas/components/` | ViolationBadge, ViolationTooltip for canvas visualization |
| Canvas Violation Hooks | `src/modules/canvas/hooks/` | useNodeViolations, useEdgeViolations for per-element violations |
| Validation Panel | `src/modules/validation/components/` | ValidationPanel, ViolationCard, ViolationList for managing violations |
| Validation Panel Hook | `src/modules/validation/hooks/` | useValidationPanel for panel state with Ctrl+Shift+V shortcut |
| External Canvas Navigation | `src/modules/canvas/components/GraphCanvas.tsx` | ReactFlowProvider wrapper + ExternalSelectionHandler for centering on external selection |
| Unified Connections | `src/adapters/sqlite/SQLiteConnectionAdapter.ts` | `source_type`/`target_type` for entity↔entity, entity↔resource, resource↔resource |
| Resource Adapter | `src/adapters/sqlite/SQLiteResourceAdapter.ts` | CRUD for resources with extraction status tracking |
| Blob Storage | `src/services/blobStorage/` | IndexedDB-based binary file storage with IBlobStorage interface |
| Resource State | `src/store/resourceState.ts` | Legend-State slice for resources with upload progress tracking |
| Resource Actions | `src/store/resourceActions.ts` | Upload, delete, and blob retrieval actions |
| Resource Upload UI | `src/modules/sophia/components/ResourceUploadDialog.tsx` | Drag-and-drop file upload dialog with validation |
| Resource Node | `src/modules/canvas/components/ResourceNode.tsx` | Custom React Flow node for resources with type-based colors |
| Resource Color Scheme | `src/shared/theme/resourceColors.ts` | Per-type and unified color schemes for resource nodes |
| Resource Config | `src/config/devSettings.ts` | DevSettings section for resources (enabled, nodeColorScheme) |
| Resource Nodes Hook | `src/modules/canvas/hooks/useResourcesAsNodes.ts` | Convert resources to React Flow nodes with `resource-` ID prefix |
| Resource Detail Panel | `src/modules/sophia/components/ResourceDetailPanel.tsx` | View/edit resource metadata, download, delete |
| Mixed Node Canvas | `src/modules/canvas/components/GraphCanvas.tsx` | Render both entity and resource nodes, handle mixed selections |
| Browser Extraction | `src/modules/resources/extraction/` | DOCX (mammoth), XLSX (SheetJS), MD extractors for text content |
| Extraction Service | `src/modules/resources/extraction/BrowserExtractionService.ts` | Orchestrates extraction, updates resource status, triggers post-extraction |
| Resources FTS5 | `src/database/migrations/resources_fts.ts` | FTS5 virtual table with sync triggers for resources |
| Resource Embeddings | `src/adapters/sqlite/SQLiteEmbeddingAdapter.ts` | `storeForResource()`, `findSimilarResources()` for resource semantic search |
| Post-Extraction Hook | `src/modules/resources/extraction/postExtraction.ts` | Generates embeddings after text extraction completes |
| Auto-Extract on Upload | `src/store/resourceActions.ts` | Triggers browser extraction for supported file types on upload |
| Resource Search | `src/adapters/sqlite/SQLiteSearchAdapter.ts` | `searchResources()`, `semanticSearchResources()` for resource FTS and vector search |
| AI Extraction | `src/modules/resources/extraction/AIExtractionService.ts` | PDF and image extraction using Gemini multimodal |
| Multimodal AI | `src/modules/ai/backends/GeminiBackend.ts` | `generateWithAttachment()` for vision/document understanding |
| Extraction Strategy | `src/config/devSettings.ts` | `resources.extraction.strategy` for browser/AI/hybrid routing |
| Unified Search | `src/modules/search/hooks/useCommandPalette.ts` | Command Palette searches entities AND resources in parallel |
| URL Resources | `src/modules/resources/url/UrlResourceService.ts` | Reference (bookmark) and AI Extract modes for URLs |
| URL Dialog | `src/modules/sophia/components/UrlResourceDialog.tsx` | Dialog for adding URL resources with mode selection |
| URL Config | `src/config/devSettings.ts` | `url.defaultMode` and `url.autoExtract` settings |
| Chat Module | `src/modules/chat/` | Slide-over chat panel with thread management and IndexedDB persistence |
| Chat State | `src/modules/chat/store/chatState.ts` | Legend-State slice for threads, messages, and panel visibility |
| Chat Actions | `src/modules/chat/store/chatActions.ts` | Thread/message CRUD, panel toggle, persistence loading |
| Chat Persistence | `src/modules/chat/services/ChatPersistence.ts` | IndexedDB storage for chat threads and messages |
| Chat Panel | `src/modules/chat/components/` | ChatPanel, ChatHeader, ChatMessages, ChatInput, ChatToggleButton |
| Chat Config | `src/config/devSettings.ts` | `chat.enabled`, `chat.position`, `chat.showToggleButton` settings |
| Chat Keyboard | `src/modules/chat/components/ChatToggleButton.tsx` | Ctrl+Shift+C to toggle chat panel |
| Context Builder | `src/modules/chat/services/ContextBuilder.ts` | GraphRAG context gathering with 3 strategies |
| Context Strategies | `src/modules/chat/services/contextStrategies/` | Selected, Similarity, Traversal strategies |
| Context Formatter | `src/modules/chat/services/ContextFormatter.ts` | Format context items for AI prompts |
| Context Config | `src/config/devSettings.ts` | `chat.context.*` settings for context building |
| Chat Service | `src/modules/chat/services/ChatService.ts` | Orchestrates chat flow: context → prompt → AI → response |
| Prompt Templates | `src/modules/chat/services/promptTemplates.ts` | System prompts for knowledge capture |
| AI Streaming | `src/modules/ai/backends/GeminiBackend.ts` | SSE streaming via `generateStream()` method |
| Generation Config | `src/config/devSettings.ts` | `chat.generation.*` settings for AI generation |
| Proposal Parser | `src/modules/chat/services/ProposalParser.ts` | Extract athena-proposals JSON from AI responses |
| Self-Correcting Extractor | `src/modules/chat/services/SelfCorrectingExtractor.ts` | Retry extraction with LLM error feedback |
| Proposal Schema | `src/modules/chat/services/proposalSchema.ts` | Zod validation for proposal structure |
| Extraction Config | `src/config/devSettings.ts` | `chat.extraction.*` settings for parsing |
| MentionInput | `src/modules/chat/components/MentionInput.tsx` | @mention autocomplete with fuzzy search |
| MentionSuggestions | `src/modules/chat/components/MentionSuggestions.tsx` | Dropdown with keyboard navigation |
| ContextChips | `src/modules/chat/components/ContextChips.tsx` | Thread context display bar |
| useMentions Hook | `src/modules/chat/hooks/useMentions.ts` | Note search with fuzzy matching |
| useCanvasSelection Hook | `src/modules/chat/hooks/useCanvasSelection.ts` | Bridge canvas ↔ chat context |
| Mentions Config | `src/config/devSettings.ts` | `chat.mentions.*` settings for autocomplete |
| Spatial Context Config | `src/config/devSettings.ts` | `chat.spatialContext.*` settings for context chips |

**See [docs/PATTERNS.md](docs/PATTERNS.md) for detailed examples and usage.**

---

## Data Models

| Type | Location | Description |
|------|----------|-------------|
| Entity | `src/shared/types/entities.ts` | Note, Plan, Document with bi-temporal |
| Connection | `src/shared/types/connections.ts` | Entity/Resource relationships with tri-color + NodeType |
| Resource | `src/shared/types/resources.ts` | PDF, DOCX, URL, etc. with extraction status |
| Cluster | `src/shared/types/clusters.ts` | N-way groupings with member roles |
| Embedding | `src/shared/types/embeddings.ts` | Vector storage for similarity |
| ResourceEmbeddingRecord | `src/shared/types/embeddings.ts` | Embedding record for resources (resource_id instead of entity_id) |
| ResourceSimilarityResult | `src/shared/types/embeddings.ts` | Resource similarity search result |
| SearchResult | `src/adapters/ISearchAdapter.ts` | Search result with snippet, score, matchType, createdAt, updatedAt |
| ResourceSearchResult | `src/adapters/ISearchAdapter.ts` | Resource search result with resourceId, name, type, snippet, score |
| ExtractionResult | `src/modules/resources/extraction/types.ts` | Text extraction result with optional structured data and error |
| IExtractor | `src/modules/resources/extraction/types.ts` | Interface for file type extractors |
| AttachmentInput | `src/modules/ai/types.ts` | Base64-encoded file attachment for multimodal AI |
| GenerateWithAttachmentOptions | `src/modules/ai/types.ts` | Options for multimodal generation (prompt + attachment) |
| ExtractionStrategy | `src/config/devSettings.ts` | 'browser' | 'ai' | 'browser-then-ai' extraction routing |
| UrlConfig | `src/config/devSettings.ts` | URL handling settings (defaultMode, autoExtract) |
| UrlMode | `src/shared/types/resources.ts` | 'reference' | 'extracted' URL resource modes |
| Facet | `src/modules/search/types/facets.ts` | Facet definition with values and counts for filtering |
| CommandPaletteResult | `src/modules/search/hooks/useCommandPalette.ts` | Unified search result for entities and resources |
| SuggestedConnection | `src/store/state.ts` | AI-suggested connections (ephemeral, not persisted) |
| ValidationRule | `src/modules/validation/types/rules.ts` | SHACL-inspired rule definition with evaluate function |
| ValidationContext | `src/modules/validation/types/rules.ts` | Graph snapshot with pre-built indexes for rule evaluation |
| Violation | `src/modules/validation/types/violations.ts` | Validation result with focus node, message, and fix suggestion |
| ValidationReport | `src/modules/validation/types/reports.ts` | Complete validation run results with summary stats |
| IValidationService | `src/modules/validation/interfaces/` | Bridge interface for Phase 5A/5B swap |
| RulesEngine | `src/modules/validation/engine/` | Stateless engine for rule registration and evaluation |
| ContextBuilderInput | `src/modules/validation/engine/` | Input for building ValidationContext with O(1) indexes |
| ValidationState | `src/modules/validation/store/` | Legend-State slice with violations, lastReport, dismissedIds |
| ResourceState | `src/store/resourceState.ts` | Legend-State slice for resources with upload progress tracking |
| ChatMessage | `src/modules/chat/types/index.ts` | Message with threadId, role, content, and optional proposals |
| ChatThread | `src/modules/chat/types/index.ts` | Thread with title, contextNodeIds, and timestamps |
| ChatState | `src/modules/chat/types/index.ts` | Legend-State slice for threads, messages, and panel state |
| KnowledgeProposals | `src/modules/chat/types/index.ts` | AI-proposed nodes and edges (WP 7.4 placeholder) |
| NodeProposal | `src/modules/chat/types/index.ts` | Proposed entity with confidence and status |
| EdgeProposal | `src/modules/chat/types/index.ts` | Proposed connection with rationale and confidence |
| ChatConfig | `src/config/devSettings.ts` | Chat module configuration (enabled, position, persistence) |
| ContextItem | `src/modules/chat/services/contextStrategies/types.ts` | Single context item with id, type, title, content, relevance, source |
| ContextOptions | `src/modules/chat/services/contextStrategies/types.ts` | Options for context building (selectedNodeIds, query, maxItems, etc.) |
| ContextResult | `src/modules/chat/services/contextStrategies/types.ts` | Result with items, token estimate, debug info |
| ContextConfig | `src/config/devSettings.ts` | Context builder settings (maxItems, similarityThreshold, traversal) |
| AIChatMessage | `src/modules/ai/types.ts` | Message format for AI conversations (role + content) |
| StreamOptions | `src/modules/ai/types.ts` | Options for streaming generation with callbacks |
| StreamResult | `src/modules/ai/types.ts` | Result of streaming generation (fullResponse, tokenCount) |
| GenerationConfig | `src/config/devSettings.ts` | Generation settings (enableProposals, historyLimit, temperature, maxTokens) |
| ExtractionConfig | `src/config/devSettings.ts` | Extraction settings (enableSelfCorrection, maxCorrectionAttempts, minConfidenceThreshold) |
| ExtractionResult | `src/modules/chat/services/ProposalParser.ts` | Result of extraction attempt (success, proposals, error, rawJson) |
| SelfCorrectionResult | `src/modules/chat/services/SelfCorrectingExtractor.ts` | Result with iteration count and final error |
| RawProposals | `src/modules/chat/services/proposalSchema.ts` | Zod schema for AI proposal output (before adding IDs/status) |
| RawNodeProposal | `src/modules/chat/services/proposalSchema.ts` | Zod schema for raw node proposal |
| RawEdgeProposal | `src/modules/chat/services/proposalSchema.ts` | Zod schema for raw edge proposal |

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
| mammoth | 1.x | DOCX to text extraction |
| xlsx | 0.18.x | Excel file parsing (SheetJS) |
| zod | 3.x | Schema validation |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| vite | 7.x | Build tool |
| typescript | 5.9.x | Type checking |
| tailwindcss | 3.x | Styling |
| eslint | 9.x | Linting |

---

## Coming Next

| Phase | What's Added |
|-------|--------------|
| **Phase 8** | Publishing, Templates, Advanced Features |

### Phase 7 Complete

| WP | Feature | Status |
|----|---------|--------|
| 7.1 | Chat UI & State | ✅ |
| 7.2 | GraphRAG Context Builder | ✅ |
| 7.3 | Conversational Generation | ✅ |
| 7.4 | Knowledge Extraction Parser | ✅ |
| 7.5 | Proposal Cards UI | ✅ |
| 7.6 | Spatial Awareness | ✅ |

---

## Console Debugging

```javascript
window.__ATHENA_STATE__           // Main app state
window.__ATHENA_DEV_SETTINGS__    // Feature flags
window.__ATHENA_VALIDATION_STATE__ // Validation state (violations, reports)
window.__ATHENA_RESOURCE_STATE__  // Resource state (resources, upload progress)
window.__ATHENA_CHAT_STATE__      // Chat state (threads, messages, panel)
window.__ATHENA_CHAT__            // Chat actions for testing
window.__ATHENA_CONTEXT_BUILDER__ // Context builder instance
window.__ATHENA_CHAT_SERVICE__    // Chat service instance (WP 7.3)
window.__ATHENA_EXTRACTION__      // Browser extraction service
window.__ATHENA_AI_EXTRACTION__   // AI extraction service
window.__ATHENA_DB__()            // Database connection (function)
await __ATHENA_FTS_DEBUG__()      // FTS index status (resource count, FTS count, samples)
```

---

*Update this file at the end of every Work Package.*
