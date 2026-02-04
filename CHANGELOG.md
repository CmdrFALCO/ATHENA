# ATHENA Changelog

## [9B.5.0] - 2026-02-04

### Added
- **Structural Invariance (WP 9B.5)**: Tests whether AI-suggested connections survive paraphrase rewriting and compression/summarization — populates the `invarianceScore` confidence factor with real evidence
  - **ParaphraseStabilityTest**: Generates N paraphrase variants of each note via `IAIBackend.generate()`, computes NxN cosine similarity pairs via `IAIBackend.embed()`, measures survival rate (fraction of pairs ≥ threshold), variance, and min/max relative scores
  - **CompressionSurvivalTest**: Compresses notes to progressively shorter lengths (50%, 30%, 20%), checks if connection similarity survives at each level, interprets deepest survival as `core_relationship | contextual_relationship | surface_pattern`
  - **InvarianceService**: Orchestrates both tests, aggregates scores (60% paraphrase + 40% compression), assigns robustness labels (`robust ≥ 0.7`, `moderate ≥ 0.4`, `fragile < 0.4`, `untested`), generates human-readable failure modes
  - **SQLiteInvarianceAdapter**: Persistence layer for `InvarianceEvidence` with upsert semantics, JSON serialization for compression curve and failure modes, query by label or score range
  - **InvarianceBadge**: Compact UI badge showing robustness status with color-coded shield icons (ShieldCheck/Shield/ShieldAlert/ShieldQuestion), hover tooltip with test details and failure modes
  - **TestRobustnessButton**: Reusable button triggering invariance tests with loading spinner, error state, and result display via InvarianceBadge
  - **Database migration 015**: `connection_invariance` table with paraphrase/compression fields, invariance_score, robustness_label, failure_modes (JSON), indexed on score and label
  - **Fragile floor veto**: Optional config (`fragileFloorVeto`) to force `queue_for_review` when invariance label is `'fragile'`, integrates with existing floor veto mechanism
  - `src/modules/axiom/autonomous/invariance/` — 5 new files (types, ParaphraseStabilityTest, CompressionSurvivalTest, InvarianceService, SQLiteInvarianceAdapter, barrel)
  - `src/modules/axiom/components/InvarianceBadge.tsx` — Robustness badge component
  - `src/modules/axiom/components/TestRobustnessButton.tsx` — Test trigger button component

### Changed
- `src/modules/axiom/autonomous/AutonomousCommitService.ts` — Extended `MultiFactorStack` with optional `invarianceAdapter` and `invarianceConfig`; `buildMultiFactors()` now looks up pre-computed invariance evidence to populate `invarianceScore`; added fragile floor veto check in `evaluateMultiFactor()`
- `src/modules/axiom/autonomous/confidence/MultiFactorConfidenceCalculator.ts` — Updated `invarianceScore` explanations (low: "wording artifact", high: "structurally robust")
- `src/config/devSettings.ts` — Added `invariance: InvarianceConfig` to `AXIOMConfig` with defaults (disabled, manual trigger, 3 variants, 0.7 threshold, levels [0.5, 0.3, 0.2], weights 60/40, fragileFloorVeto: false) + 10 setter actions
- `src/modules/canvas/components/ConnectionInspector.tsx` — Added "Structural Invariance" section with TestRobustnessButton (visible when `devSettings$.axiom.invariance.enabled`)
- `src/modules/axiom/components/ReviewQueue/ReviewCard.tsx` — Added InvarianceBadge next to confidence badge, fragile border highlight (`border-red-500/40`)
- `src/modules/axiom/autonomous/index.ts` — Exported invariance types and classes
- `src/modules/axiom/components/index.ts` — Exported InvarianceBadge and TestRobustnessButton
- `src/modules/axiom/index.ts` — Exported invariance module, added `__ATHENA_INVARIANCE__` debug global
- `src/database/migrations/index.ts` — Exported `setupConnectionInvariance`
- `src/database/init.ts` — Added `setupConnectionInvariance()` migration call
- `CODEBASE_MAP.md` — Documented invariance module (10 new pattern entries, 7 type entries, 1 debug global)

### Deferred
- **Drift detection**: Re-test connections periodically to detect semantic drift over time
- **Saturation testing**: Test if adding more paraphrase variants changes the survival rate
- **CPN guard integration**: `invariancePassed` guard wired into AXIOM workflow transitions
- **Auto-reject fragile**: Automatically reject connections with `fragile` invariance (currently only queues for review)

### Technical
- **Pre-computed evidence**: Invariance tests are expensive (multiple AI calls per connection) — results are cached in SQLite and looked up during confidence evaluation rather than computed inline
- **Graceful degradation**: Both tests return `tested: false` on AI backend failure — null factors are skipped in weighted scoring
- **Aggregate scoring**: 60% paraphrase survival + 40% compression survival; single test score used when only one test succeeds
- **Compression normalization**: Deepest survival level mapped to 0–1 score via `(1.0 - level) / 0.8` (level 0.2 → score 1.0, level 1.0 → score 0.0)
- **`testConnectionDirect()`**: Alternative entry point for proposals where connections don't yet exist in DB — accepts raw content strings instead of connection ID

## [9B.4.0] - 2026-02-04

### Added
- **Human Review Queue (WP 9B.4)**: Deferred human oversight for autonomous commits — items below confidence thresholds are queued for review with approve, reject, edit-and-approve, and bulk actions
  - **ReviewActions**: Business logic service for approve, reject, editAndApprove, bulkApprove, bulkReject — uses ProvenanceAdapter for status updates and AXIOMEventBridge for event emission
  - **reviewState$**: Legend-State observable slice for review queue (items, stats, sort, filter, selectedIds, activeTab) with debug globals
  - **useReviewQueue**: React hook with optimistic UI updates, event-driven auto-refresh, client-side sorting/filtering, bulk operations
  - **ReviewQueueTab**: Main container composing stats bar, filters, batch actions, review cards, and collapsible auto-approved section
  - **ReviewStatsBar**: Compact stats bar showing pending count, auto-approved (24h), avg confidence, and refresh button
  - **ReviewFilters**: Sort buttons (confidence, date, reason) and filter dropdown for queue reason
  - **ReviewBatchActions**: Bulk approve/reject when items are selected with selection count
  - **ReviewCard**: Full review card with checkbox, entity/connection icon, confidence badge (color-coded), queue reason pill, expandable confidence breakdown, inline edit fields, accept/reject/edit-and-accept actions
  - **AutoCommitCard**: Spot-check card for auto-approved items with revert button
  - **Review event types**: `review:queued`, `review:decided`, `review:batch_decided` events with typed payloads
  - **ReviewQueueReason**: `low_confidence | floor_veto | validation_failed | rate_limited | scope_restricted` classification
  - **recordPendingReview()**: New method on AutonomousCommitService — creates provenance record with `pending_review` status without committing entity
  - `src/modules/axiom/autonomous/review/` — 4 new files (types, ReviewActions, reviewState, barrel)
  - `src/modules/axiom/components/ReviewQueue/` — 6 new UI components (ReviewQueueTab, ReviewStatsBar, ReviewFilters, ReviewBatchActions, ReviewCard, AutoCommitCard)
  - `src/modules/axiom/hooks/useReviewQueue.ts` — Review queue React hook

### Changed
- `src/modules/axiom/events/types.ts` — Added 3 review event types to union, ReviewQueueReason type, ReviewQueuedEventData, ReviewDecidedEventData, ReviewBatchDecidedEventData payloads
- `src/modules/axiom/events/AXIOMEventBridge.ts` — Added review events to MINIMAL_EVENTS array
- `src/modules/axiom/events/index.ts` — Exported review event types
- `src/modules/axiom/autonomous/AutonomousCommitService.ts` — Added event bridge integration, `recordPendingReview()`, `emitReviewQueued()`, `classifyQueueReason()`, `setEventBridge()`
- `src/modules/axiom/components/AXIOMPanel.tsx` — Added top-level tab bar (Workflow | Review) with pending count badge and amber highlight threshold
- `src/modules/axiom/components/AXIOMIndicator.tsx` — Added pending review count badge with ClipboardList icon, click-to-review-tab behavior
- `src/config/devSettings.ts` — Added `reviewQueue` section to AXIOMConfig (defaultSort, showAutoApprovedSection, autoApprovedLimit, highlightThreshold) + 4 setter actions
- `src/modules/axiom/autonomous/index.ts` — Exported review module types, services, and state
- `src/modules/axiom/hooks/index.ts` — Exported useReviewQueue
- `src/modules/axiom/components/index.ts` — Exported ReviewQueue UI components
- `src/modules/axiom/index.ts` — Exported review module, added `__ATHENA_REVIEW_QUEUE__` debug global
- `CODEBASE_MAP.md` — Documented review queue module (12 new pattern entries, 9 type entries, 2 debug globals)

### Technical
- **Pending review items are NOT committed to the graph**: They exist only as provenance records — approve flips status to `human_confirmed`, reject flips to `human_reverted`
- **Optimistic UI updates**: Cards removed immediately on action, re-fetched on failure
- **Event-driven refresh**: Review queue auto-refreshes when `review:queued`, `review:decided`, or `review:batch_decided` events fire
- **Top-level tab architecture**: AXIOMPanel now has Workflow | Review tabs, with existing Graph/Tokens/History as sub-tabs under Workflow
- **Confidence breakdown reuse**: ReviewCard replicates the ConfidenceBreakdown pattern from ProposalCards.tsx without modifying the original component
- **Backward compatible**: Review queue is a read-only consumer of provenance records — no changes to the autonomous decision flow

## [9B.2.0] - 2026-02-04

### Added
- **Autonomous Mode (WP 9B.2)**: AI auto-commit with deferred human oversight — high-confidence proposals auto-commit while maintaining full provenance, revert capability, and rate limiting
  - **AutonomousCommitService**: Core decision logic — evaluates proposals against confidence gates, scope rules, and rate limits. Auto-commits, queues for review, or auto-rejects based on configurable thresholds
  - **ProvenanceAdapter**: SQLite persistence for auto-commit audit trail — every autonomous commit creates an `AutoCommitProvenance` record with revert snapshot
  - **RateLimiter**: Enforces hourly/daily/queue-depth limits — in-memory ring buffer for fast checks, DB fallback for daily totals
  - **SimpleConfidenceCalculator**: Weighted aggregate scoring (proposal 35%, validation 25%, critique 25%, novelty 15%). Modular design for WP 9B.3 replacement
  - **Autonomous Presets**: Three preset configs (strict/balanced/permissive) with different thresholds and limits — users can customize from any preset
  - **autonomousState$**: Legend-State observable slice for runtime stats (auto-commit counts, pause state, recent decisions)
  - **useAutonomous**: React hook exposing config, runtime stats, and pause/resume actions
  - **AutoCommitToastContainer**: Floating notification toasts for auto-commits with undo button, auto-dismiss after 5s
  - **Cyan connection color**: `ConnectionColor` union extended with `'cyan'`, `ATHENA_COLORS.connection.autoApproved` (#06b6d4) for auto-approved connections
  - **`ai_auto_approved` creator**: `ConnectionCreator` union extended with `'ai_auto_approved'`
  - **processProposalWithAutonomy()**: New wrapper on `AXIOMValidationService` that evaluates for autonomous commit after workflow completes
  - **Database migration 014**: `auto_commit_provenance` table with status, confidence, date, and correlation indexes
  - `src/modules/axiom/autonomous/` — 9 new files (types, presets, adapter, limiter, calculator, service, state, toast, barrel)
  - `src/modules/axiom/hooks/useAutonomous.ts` — Autonomous mode React hook

### Changed
- `src/config/devSettings.ts` — Added `autonomous` section to `AXIOMConfig` (enabled, preset, thresholds, limits, scope, ui) + 10 setter actions
- `src/shared/types/connections.ts` — Extended `ConnectionColor` with `'cyan'`, `ConnectionCreator` with `'ai_auto_approved'`
- `src/shared/theme/colors.ts` — Added `connection.autoApproved` (#06b6d4)
- `src/modules/canvas/components/ConnectionEdge.tsx` — Added `cyan: 'autoApproved'` to color mapping
- `src/modules/axiom/services/AXIOMValidationService.ts` — Added `processProposalWithAutonomy()`, `setAutonomousService()`, `executeCommitForAutonomy()`
- `src/modules/axiom/components/AXIOMIndicator.tsx` — Added autonomous mode badge with Zap icon, commit counter, pause state indication
- `src/modules/chat/components/ProposalCards.tsx` — Extended with autonomous states (auto-committed badge, queued-for-review badge, auto-rejected with override, confidence details expandable)
- `src/modules/axiom/hooks/index.ts` — Exported `useAutonomous`
- `src/modules/axiom/index.ts` — Exported autonomous module, extended `__ATHENA_AUTONOMOUS__` debug globals
- `src/database/init.ts` — Added `setupAutoCommitProvenance()` migration call
- `src/database/migrations/index.ts` — Exported new migration
- `CODEBASE_MAP.md` — Documented autonomous module (10 new pattern entries, 7 type entries, 2 debug globals)

### Technical
- **Post-workflow decision layer**: Autonomous mode intercepts AFTER the AXIOM CPN workflow completes — the CPN workflow itself is unchanged
- **Non-negotiable rules enforced**: (1) CPN validation always runs, (2) full provenance trail, (3) revert capability, (4) rate limiting exists, (5) disabled by default, (6) human override always available
- **Backward compatible**: When `autonomous.enabled === false` (default), system behaves identically to WP 9B.1
- **Confidence scoring**: Weighted aggregate of proposal confidence, validation score, critique survival, and novelty score
- **Three-tier routing**: Above auto-accept → auto-commit with cyan indicator; between thresholds → queue for review; below auto-reject → auto-reject with override option

## [9B.1.0] - 2026-02-03

### Added
- **Devil's Advocate Critique Layer (WP 9B.1)**: Adversarial proposal validation — every proposal can be challenged before commitment
  - Full critique implementation (see git history for details)

## [9A.4.0] - 2026-02-02

### Added
- **AXIOM Integration (WP 9A.4)**: Wiring Der Supervisor into Phase 5A (Validation) and Phase 7 (AI Chat) — closing the corrective feedback loop
  - **validationIntegration**: Connects AXIOM to Phase 5A RulesEngine — builds `ValidationContext` from proposal + existing graph, runs `rulesEngine.evaluate()`, maps violations to `VALIDATION_RESULT` with 3-level pass/fail analysis
  - **chatIntegration**: Connects AXIOM to Phase 7 ChatService for feedback-driven regeneration — formats `CorrectionFeedback[]` as LLM prompt, calls `ChatService.regenerate()`, returns new `PROPOSAL` with accumulated feedback history
  - **graphIntegration**: Commits accepted proposals to the knowledge graph — adapter injection via `setGraphAdapters()`, creates nodes first (tracking ID mappings), then edges with resolved IDs, refreshes `appState$`
  - **AXIOMValidationService**: Full `IValidationService` implementation using AXIOM CPN workflow — lazy engine initialization, creates token → adds to P_proposals → runs engine → inspects final position → builds `WorkflowResult`
  - **ChatService.regenerate()**: New method for feedback-driven regeneration — builds regeneration prompt from template, calls AI non-streaming, parses proposals, adds feedback system message to thread for transparency
  - **REGENERATION_SYSTEM_PROMPT**: Prompt template for LLM regeneration with `{originalProposal}`, `{feedback}`, `{attempt}`, `{maxAttempts}` placeholders
  - **useAXIOM**: Main hook for AXIOM engine state and actions — reactive state, pause/resume/reset, `processProposal()` with lazy service import
  - **useTokens**: Token access hooks — `useTokens(placeId?)`, `useTokenCount()`, `useHasToken()`, `useTotalTokenCount()`
  - **useWorkflowState**: High-level workflow phase hook — determines phase from token placement (idle/validating/deciding/feedback/committed/rejected), retry count, transition history
  - **getValidationService()**: Factory function that returns `axiomValidationService` when AXIOM enabled, `validationService` otherwise
  - `src/modules/axiom/integration/` — 3 integration files + barrel export
  - `src/modules/axiom/services/AXIOMValidationService.ts` — Service singleton
  - `src/modules/axiom/hooks/useAXIOM.ts`, `useTokens.ts`, `useWorkflowState.ts` — React hooks

### Changed
- `src/config/devSettings.ts` — Added `workflow.runMode` ('auto'|'step'), `feedback` section (includeHistory, verbosity) to `AXIOMConfig` + 3 new action methods
- `src/modules/axiom/workflows/placeholders.ts` — Added real implementation re-exports and `createRealPlaceholders()` factory
- `src/modules/axiom/index.ts` — Exported integration, services, hooks; extended `__ATHENA_AXIOM__` debug globals with `processProposal` and `getService`
- `src/modules/axiom/hooks/index.ts` — Exported useAXIOM, useTokens, useTokenCount, useHasToken, useTotalTokenCount, useWorkflowState
- `src/modules/chat/services/ChatService.ts` — Added `regenerate()` method for feedback-driven proposal regeneration
- `src/modules/chat/services/promptTemplates.ts` — Added `REGENERATION_SYSTEM_PROMPT` and `formatRegenerationPrompt()`
- `src/modules/chat/services/ProposalAcceptService.ts` — Added AXIOM routing: `acceptNodeViaAXIOM()`, `acceptEdgeViaAXIOM()` with fallback to direct creation
- `src/modules/validation/services/index.ts` — Added `getValidationService()` factory for AXIOM/simple switching

### Technical
- **Corrective feedback loop now live**: Validation violations → `FeedbackBuilder.fromViolations()` → `CorrectionFeedback[]` → `formatFeedbackForLLM()` → `ChatService.regenerate()` → new `PROPOSAL` → re-validation
- **Three-level validation**: L1 (schema: orphan-note, self-loop), L2 (constraints: duplicate-connection, bidirectional), L3 (semantic: weakly-connected, stale-suggestion)
- **Adapter injection pattern**: `setGraphAdapters(notes, connections)` for DI without circular imports
- **Lazy initialization**: `AXIOMValidationService.ensureInitialized()` creates engine + wires net on first use
- **DevSettings toggle**: `devSettings$.axiom.enabled` switches between AXIOM and SimpleValidationService at runtime
- **Feedback accumulation**: Each regeneration appends feedback to `feedbackHistory` — never replaces
- **Engine re-initialization**: Each workflow creates a fresh engine to avoid stale state between runs

## [9A.3.0] - 2026-02-02

### Added
- **AXIOM Visualization (WP 9A.3)**: Making Der Supervisor visible — visibility IS the trust mechanism
  - **AXIOMIndicator**: Status bar indicator in header showing workflow state, token counts, pulsing dot when active, error badge
  - **AXIOMPanel**: Full workflow sidebar panel (480px slide-over) with Graph/Tokens/History tabs, Ctrl+Shift+A toggle
  - **WorkflowGraph**: React Flow CPN visualization rendering 7 places as nodes, 6 transitions as bars, with token count badges and enabled-state highlighting
  - **TokenInspector**: Raw `_meta` data display (Principle 1: Minimal Abstraction) with expandable JSON trees, feedback history, copy-to-clipboard
  - **TransitionLog**: Chronological decision trail (Principle 2: Transparency) with every transition's `reason` always visible, filterable, searchable, exportable as JSON
  - **FeedbackDisplay**: Structured corrective feedback view with constraint level badges, severity indicators, actual/expected values, and suggestion display
  - **InterventionModal**: Human escalation modal for Accept Anyway / Edit & Retry / Reject decisions when token exceeds retry threshold
  - **AXIOMControls**: Pause/Step/Resume/Reset controls with step counter display
  - **useAXIOMPanel**: Hook for panel state management with Ctrl+Shift+A keyboard shortcut
  - `src/modules/axiom/components/` — 8 visualization components + barrel export
  - `src/modules/axiom/hooks/` — Panel management hook

### Changed
- `src/config/devSettings.ts` — Added `visualization` section to `AXIOMConfig` (showIndicator, showPanelButton, autoOpenOnError)
- `src/modules/axiom/store/axiomState.ts` — Added UI state fields (panelOpen, selectedTab, selectedTokenId, selectedPlaceId, lastError, interventionPending)
- `src/modules/axiom/store/axiomActions.ts` — Added panel/selection/error actions
- `src/app/layout/Header.tsx` — Integrated AXIOMIndicator (controlled by devSettings)
- `src/app/layout/AppLayout.tsx` — Integrated AXIOMPanel and InterventionModal overlays
- `src/modules/axiom/index.ts` — Exported components, hooks, and added `__ATHENA_AXIOM_UI__` debug globals

## [9A.2.0] - 2026-02-02

### Added
- **Validation Workflow Net (WP 9A.2)**: CPN workflow for the corrective feedback loop — the core AXIOM innovation
  - **7 Places**: P_proposals (source), P_validating (reserved), P_deciding, P_verified, P_feedback, P_committed (sink), P_rejected (sink)
  - **6 Transitions**: T_validate, T_accept, T_prepare_retry, T_regenerate, T_reject, T_commit with priority-based routing
  - **FeedbackBuilder**: Converts Phase 5A `Violation[]` into `CorrectionFeedback[]` with rule-level inference, suggestion mapping, and custom feedback support
  - **Validation Guards**: `isValid`, `hasErrors`, `hasWarningsOnly`, `tokenCanRetry`, `tokenShouldEscalate`, `allLevelsPassed`, `levelPassed`
  - **Schema Guards (Level 1)**: `nodesHaveRequiredFields`, `edgesHaveRequiredFields`, `schemaValid`
  - **Constraint Guards (Level 2)**: `noSelfLoops`, `noDuplicateEdges`, `referencedNodesExist`
  - **Semantic Guards (Level 3)**: `semanticallyRelevant`, `contentCoherent`, `notDuplicate` (stubs for WP 9A.4)
  - **Validation Net Factory**: `createValidationNet()`, `wireValidationNet()`, `createProposalToken()` for engine wiring
  - **Placeholder Functions**: Stub implementations for `validateProposal`, `regenerateProposal`, `commitProposal` (replaced in WP 9A.4)
  - `src/modules/axiom/workflows/` — Complete workflow module with places, transitions, placeholders, types
  - `src/modules/axiom/engine/FeedbackBuilder.ts` — Violation-to-feedback bridge
  - `src/modules/axiom/guards/` — 4 new guard files (validation, schema, constraints, semantic)

### Technical
- **Corrective feedback loop**: Validation errors become structured `CorrectionFeedback` → formatted for LLM prompt → guided regeneration → re-validation
- **Feedback accumulation**: `feedbackHistory` is APPENDED (never replaced) on both `token.feedbackHistory` and `token.payload.feedbackHistory`
- **Priority-based routing**: T_accept(20) > T_prepare_retry(15) > T_reject(10) with complementary guards
- **Token routing via color**: Action functions set output token color; `Transition.fire()` deposits into first place that accepts that color
- **Payload type**: `ValidatedPayload = PROPOSAL & { validationResult: VALIDATION_RESULT }` preserves original proposal across transitions
- **Guard wrapper pattern**: `tokenCanRetry`/`tokenShouldEscalate` wrap single-token helpers for array-based `GuardFunction` interface
- **`correlationId`** preserved across all token type transformations (PROPOSAL → ValidatedPayload → PROPOSAL)
- `ViolationFixType` mapped to `CorrectionFeedback.suggestion.action`: delete_* → 'remove', create/update → 'modify', manual → 'rephrase'

## [9A.1.0] - 2026-02-02

### Added
- **AXIOM Engine Core (WP 9A.1)**: Foundational CPN (Coloured Petri Net) engine for neuro-symbolic validation
  - **Color Sets**: `PROPOSAL`, `VALIDATION_RESULT`, `FEEDBACK`, `TokenColor` type definitions following Jensen's CPN notation
  - **AetherToken**: Generic token type with full audit metadata (`_meta.transitionHistory`, `_meta.validationTrace`), retry tracking, and accumulated `feedbackHistory`
  - **CorrectionFeedback**: Structured error messages for LLM regeneration with `formatFeedbackForLLM()` prompt formatter
  - **Place**: Token container with capacity limits, color validation, and sink semantics
  - **Transition**: Firing logic with synchronous guards, async actions, priority ordering, and mandatory `reason` recording
  - **AXIOMEngine**: Core CPN executor — `step()`, `run()`, `pause()`, `resume()`, `reset()` with max-steps safety limit
  - **InMemoryTokenStore**: Map-based token store for testing and debug mode
  - **IndexedDBTokenStore**: Persistent token store with indexes on `correlationId`, `color`, `currentPlace`, `createdAt`
  - **Guard Helpers**: `hasMinTokens`, `hasColor`, `allOf`, `anyOf`, `not` composition utilities
  - **Termination Guards**: `canRetry`, `shouldEscalate`, `maxStepsReached`
  - **Event System**: `AXIOMEventBridge` with configurable routing (console, Legend-State, persistence) and verbosity levels
  - **Legend-State Store**: `axiomState$` observable with `axiomActions` for reactive UI updates
  - **Debug Globals**: `window.__ATHENA_AXIOM__` with state inspection, manual control, and token inspection
  - `src/modules/axiom/` — Complete module with types, engine, stores, guards, events, store

### Changed
- `src/config/devSettings.ts` — Added `AXIOMConfig` with persistence, workflow, events, and debug settings + action methods

### Technical
- Three non-negotiable principles enforced throughout:
  1. **Minimal Abstraction**: All token `_meta` data exposed, no opaque wrappers
  2. **Transparency**: Every transition records `reason` in history, no silent failures
  3. **Auditability**: Full `transitionHistory` in `_meta`, CPN model IS the specification
- Guards are enforced synchronous at the TypeScript level (`GuardFunction` returns `boolean`, not `Promise<boolean>`)
- `createToken()` factory generates proper UUIDs via `crypto.randomUUID()` and initializes all metadata
- IndexedDB follows `BlobStorageService` pattern with lazy `getDb()` initialization
- `createDefaultEngine()` factory configures engine from DevSettings, wires stores and event bridge
- Debug: `window.__ATHENA_AXIOM__`, `window.__ATHENA_AXIOM_STATE__`

## [8.10.0] - 2026-02-02

### Added
- **Export Renderers Module (WP 8.10)**: Plugin-based export system with multiple output formats
  - `RendererRegistry` with `IRenderer` interface for extensible format plugins
  - **Markdown Renderer**: YAML frontmatter, wiki-link or markdown-link format, connections section, Obsidian-compatible
  - **JSON Renderer**: Flat objects or JSON-Graph (nodes + edges) format, pretty-print toggle
  - **CSV Renderer**: Configurable columns, comma/tab delimiter, content inclusion toggle
  - **HTML Renderer**: Self-contained styled page with dark/light theme, table of contents, inline connections
  - `ExportService` orchestrates renderers, loads entities/connections via adapters, supports N-hop neighbor expansion (1-3 hops)
  - `DownloadService` triggers browser download via Blob URL
  - `ExportDropdown` — quick export with format picker + "More options..." for full dialog
  - `ExportDialog` — full options dialog with format selector, common options, and per-format panels
  - `ExportButton` — reusable trigger button with selection count badge
  - `FormatOptions` — per-format option panels (frontmatter, shape, delimiter, theme, etc.)
  - `useExportInit` hook for adapter wiring, `useExport` hook for state/actions
  - Export sources: single entity, multi-selection, Smart View results, synthesis reports
  - `ExportConfig` in devSettings with `enabled`, `showInCanvasToolbar`, `defaultFormat`
  - `src/modules/export/` — Complete module with types, renderers, services, store, hooks, components

### Changed
- `src/config/devSettings.ts` — Added ExportConfig with enabled, showInCanvasToolbar, defaultFormat settings and action methods
- `src/app/routes/SophiaPage.tsx` — Added ExportDropdown to canvas toolbar alongside SynthesisButton, ExportDialog overlay, useExportInit hook
- `src/App.tsx` — Import export store for window debug exposure

### Technical
- Follows Datasette "Renderers as Plugins" pattern — new formats can be added by implementing IRenderer and registering with rendererRegistry
- N-hop expansion uses BFS traversal via IConnectionAdapter.getConnectionsFor(), visiting neighbor entities layer by layer
- ExportService creates ExportData snapshots: entities loaded via INoteAdapter, connections filtered to include only edges where both endpoints are in the export set
- Quick export remembers last-used options per session via exportState$.lastOptions
- Synthesis export creates a synthetic ExportEntity from the report content
- Debug: `window.__ATHENA_EXPORT_STATE__`, `window.__ATHENA_EXPORT__`, `window.__ATHENA_EXPORT_SERVICE__()`

## [8.9.0] - 2026-02-01

### Added
- **Smart Views Module (WP 8.9)**: Saved, reusable queries for quick knowledge graph exploration
  - 7 built-in views: Orphan Notes, Recent Notes, Weakly Connected, Stale Notes, By Type, Unembedded Notes, Most Connected
  - Custom view creation with SQL and parameters
  - Parameter types: text, number, date, select
  - ViewSelector dropdown in sidebar for quick access with category grouping
  - ViewResultsPanel slide-over with results, refresh, and entity navigation
  - Recent views tracking (last 3 used)
  - SQL validation via EXPLAIN before saving custom views
  - `src/modules/views/` — Complete module with types, adapters, services, store, hooks, components
  - `src/database/migrations/013_smart_views.ts` — Custom views persistence table

### Changed
- `src/config/devSettings.ts` — Added ViewsConfig with enabled, showInSidebar, maxResults settings and action methods
- `src/app/layout/Sidebar.tsx` — Added ViewSelector component between navigation and entity list
- `src/app/layout/AppLayout.tsx` — Added ViewResultsPanel overlay
- `src/App.tsx` — Initialize views module on startup via initViewsModule() and viewActions.initialize()
- `src/database/init.ts` — Run setupSmartViews migration on database creation
- `src/database/migrations/index.ts` — Export setupSmartViews migration
- `CODEBASE_MAP.md` — Added views module to project structure, module index, data models, key patterns, phase progress, and console debugging

### Technical
- SQL parameter substitution with `:name` placeholders and single-quote escaping
- SQLiteViewAdapter uses the app's DatabaseConnection interface (async exec/run returning objects)
- ViewService resolves defaults, substitutes params, executes SQL, and transforms results with Tiptap preview extraction
- Built-in views are read-only; custom views stored in smart_views table with JSON-serialized parameters
- Results include preview text (first 100 chars via extractTextFromTiptap) and optional connection count
- Debug: `window.__ATHENA_VIEW_STATE__`, `window.__ATHENA_VIEWS__`

## [8.8.0] - 2026-02-01

### Added
- **Multi-Hop Reasoning (WP 8.8)**: Enhanced graph traversal for richer AI context
  - `TraversalStrategy` now supports configurable depth (1-5 hops) via BFS
  - Relevance score decays with distance: `score = baseScore × decay^(depth-1)`
  - Per-depth node budget prevents context explosion in dense graphs
  - Cycle detection via visited set ensures no duplicate processing
  - Granular source tracking: `traversal_depth_1`, `traversal_depth_2`, etc.
  - `TraversalOptions` interface for typed traversal configuration
- **New DevSettings**: `chat.context.traversalDecay` (default: 0.5), `chat.context.maxTraversalNodes` (default: 20)
- **DevSettings Panel**: Chat Context section with traversal depth, decay, and max nodes controls with live score preview

### Changed
- `src/modules/chat/services/contextStrategies/TraversalStrategy.ts` - Rewritten with BFS multi-hop traversal and relevance decay
- `src/modules/chat/services/contextStrategies/types.ts` - Added `TraversalOptions` interface, extended `ContextItem.source` with `traversal_depth_${number}`
- `src/modules/chat/services/ContextBuilder.ts` - Passes decay/maxNodes options to traversal strategy
- `src/modules/chat/services/ContextFormatter.ts` - Depth-aware source labels (e.g., "connected (2-hop)")
- `src/config/devSettings.ts` - Added `traversalDecay`, `maxTraversalNodes` to ContextConfig with clamped action methods
- `src/config/DevSettingsPanel.tsx` - New Chat Context section with traversal controls

### Technical
- BFS ensures shortest-path discovery — nodes found at lowest depth get highest score
- Default traversalDepth changed from 1 to 2 for richer context
- Score decay prioritizes closer neighbors in final context ranking
- Budget system (maxNodes) prevents runaway traversal in dense graphs
- Backward-compatible: `TraversalStrategy.gather()` accepts `Partial<TraversalOptions>`, defaults match previous behavior at depth 1

## [8.7.2] - 2026-02-01

### Added
- **Chat Resource Context (WP 8.7.2)**: Enable conversational chat about selected resources (PDFs, DOCX, URLs)
  - `ContextItem.source` gains `'document-tree'` value for document tree summaries
  - `ContextOptions` gains `selectedResourceIds` for explicit resource selection
  - `ContextResult.debug` tracks `resourceCount` separately from entities
  - `SelectedNodesStrategy.gatherResources()` loads resources with smart truncation
  - Document tree extraction: prefers section summaries (WP 8.2) over raw text
  - Smart truncation at paragraph/sentence boundaries with `[...content truncated...]` marker
  - `ContextFormatter` separates notes and resources into distinct prompt sections ("Reference Documents")
  - Resources get 10K char safety limit in formatter (already pre-truncated by strategy at 8K default)
  - Purple resource chips in `ContextChips` alongside blue note chips, with remove support
  - `useCanvasSelection` hook exposes `selectedResourceIds` and `hasResourceSelection`

### Changed
- `src/modules/chat/services/contextStrategies/types.ts` - Extended ContextItem source, ContextOptions, ContextResult.debug
- `src/config/devSettings.ts` - Added `resourceMaxChars` (default: 8000) and `useDocumentTree` (default: true) to ContextConfig with action methods
- `src/modules/chat/services/contextStrategies/SelectedNodesStrategy.ts` - Added gatherResources(), resourceToContextItem(), extractFromDocumentTree(), truncateResourceContent()
- `src/modules/chat/services/ContextBuilder.ts` - Strategy 1b for selected resources, useDocumentTree guard on document reasoning, resourceCount debug tracking
- `src/modules/chat/services/ChatService.ts` - Reads `appState$.ui.selectedResourceIds` and passes to context builder
- `src/modules/chat/services/ContextFormatter.ts` - Separate notes/resources sections, document-tree source label, resourceCount in summary
- `src/modules/chat/components/ContextChips.tsx` - Purple resource chips, combined count indicator, resource removal via uiActions
- `src/modules/chat/hooks/useCanvasSelection.ts` - Added selectedResourceIds and hasResourceSelection to return type

### Technical
- Resource IDs flow from `appState$.ui.selectedResourceIds` (canvas selection) through ChatService → ContextBuilder → SelectedNodesStrategy
- No changes to sendMessage() signature — resource IDs read from store at call time (consistent with contextNodeIds pattern)
- Document tree summaries collected recursively with indent-based hierarchy and char budget
- MentionInput unchanged — resource context is automatic from canvas selection

## [8.7.1] - 2026-02-01

### Added
- **Synthesis Resource Support (WP 8.7.1)**: Extend Synthesis Reports to include Resources (PDFs, DOCX, URLs) alongside Notes
  - `SynthesisRequest` now accepts `resourceIds`, `includeResources`, `resourceMaxChars`
  - `SynthesisReport` tracks `sourceResourceIds` for provenance
  - `SynthesisConfig` gains `includeResourcesByDefault`, `resourceMaxChars` defaults
  - Prompt builder generates separate "Notes" and "Source Documents" sections
  - Resource content truncation with document tree summary support (WP 8.2 integration)
  - `SynthesisService` loads resources via `IResourceAdapter`, queries cross-type connections
  - `SynthesisPanel` shows resource count, "Include resources" checkbox, content limit slider (1k-20k chars)
  - `SynthesisButton` displays mixed count badge ("2+1R" format)
  - Save-as-note metadata includes `resourceIds` for full source tracking

### Changed
- `src/store/state.ts` - Added `selectedResourceIds: string[]` to UIState for multi-resource selection
- `src/store/hooks.ts` - Added `useSelectedResourceIds()` hook, `toggleResourceSelection()`, `clearResourceSelection()` actions
- `src/modules/canvas/components/GraphCanvas.tsx` - Shift+click (or Ctrl/Cmd+click) toggles multi-selection for both entities and resources
- `src/app/routes/SophiaPage.tsx` - Passes both note and resource counts to SynthesisButton
- `src/config/devSettings.ts` - Added `includeResourcesByDefault`, `resourceMaxChars` to synthesis config with action methods

### Technical
- Connection loading now queries both entity and resource endpoints, deduplicating by connection ID
- Resource content uses document tree summaries (WP 8.2) when available, falls back to truncated extracted text
- Minimum 2 total items (notes + resources combined) required for synthesis generation

## [8.7.0] - 2026-02-01

### Added
- **Synthesis Reports Module (WP 8.7)**: Generate LLM summaries from subgraphs — select multiple notes, trigger "Synthesize", receive a coherent report
  - `src/modules/synthesis/types.ts` - SynthesisFormat, SynthesisRequest, SynthesisReport, SynthesisProgress, SynthesisConfig, FORMAT_INFO
  - `src/modules/synthesis/prompts/synthesisPrompts.ts` - Format-specific prompt templates (summary/outline/report), Tiptap content extraction, report title generation
  - `src/modules/synthesis/services/SynthesisService.ts` - Core generation logic with adapter-based data access, streaming AI generation, progress callbacks
  - `src/modules/synthesis/store/synthesisState.ts` - Legend-State slice for panel visibility, format options, progress, reports
  - `src/modules/synthesis/store/synthesisActions.ts` - Generate, save-as-note, panel toggle, format/length/connection options
  - `src/modules/synthesis/components/SynthesisPanel.tsx` - Main slide-over panel with format selector, length control, custom prompt, streaming display
  - `src/modules/synthesis/components/FormatSelector.tsx` - Three-column format picker (Summary/Outline/Report) with icons and descriptions
  - `src/modules/synthesis/components/ReportViewer.tsx` - Streaming content display with markdown-like rendering and auto-scroll
  - `src/modules/synthesis/components/SynthesisButton.tsx` - Canvas toolbar trigger with selected-note count badge
  - `src/modules/synthesis/index.ts` - Module barrel export

### Changed
- `src/config/devSettings.ts` - Added SynthesisConfig import, DEFAULT_SYNTHESIS_CONFIG, synthesis observable, resetToDefaults updated, 4 synthesis action methods
- `src/app/layout/AppLayout.tsx` - Added SynthesisPanel to layout
- `src/app/routes/SophiaPage.tsx` - Added SynthesisButton as floating toolbar in canvas area, conditioned on devSettings
- `src/App.tsx` - Imports synthesis store for window debug exposure

### Technical
- Uses adapter pattern (INoteAdapter, IConnectionAdapter) for data access — no direct SQL queries
- Streaming via `AIService.generateStream()` with `onChunk` callback for real-time content display
- Reports saved as notes with `subtype: 'synthesis'` and metadata tracking source entity/connection IDs
- Markdown-to-Tiptap Block[] conversion for note storage
- Debug: `window.__ATHENA_SYNTHESIS_STATE__`, `window.__ATHENA_SYNTHESIS__`, `window.__ATHENA_SYNTHESIS_SERVICE__()`

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅
- WP 8.3: Firecrawl Integration ✅
- WP 8.4: Preference Learning ✅
- WP 8.5: Knowledge Schema Templates ✅
- WP 8.6: Background Jobs ✅
- WP 8.7: Synthesis Reports ✅

## [8.6.0] - 2026-02-01

### Added
- **Background Jobs Module (WP 8.6)**: Scheduled background tasks for knowledge graph maintenance
  - `src/modules/jobs/types.ts` - JobType, BackgroundJob, JobResult, JobConfig, JobsConfig, and per-job config interfaces
  - `src/modules/jobs/adapters/JobAdapter.ts` - IJobAdapter interface + SQLiteJobAdapter for job history persistence
  - `src/modules/jobs/JobRunner.ts` - Execute jobs with progress tracking, event emission, and error handling
  - `src/modules/jobs/JobScheduler.ts` - Interval-based scheduling with stagger, last-run awareness, per-job enable/disable
  - `src/modules/jobs/implementations/IBackgroundJob.ts` - Job interface with run() and optional cancel()
  - `src/modules/jobs/implementations/SimilarityScanJob.ts` - Wraps SimilarityService.scanAll() to find merge candidates
  - `src/modules/jobs/implementations/OrphanDetectionJob.ts` - SQL query for notes with no connections older than configurable minAgeDays
  - `src/modules/jobs/implementations/StaleConnectionJob.ts` - Finds and optionally auto-deletes connections to invalidated entities
  - `src/modules/jobs/implementations/EmbeddingRefreshJob.ts` - Re-embeds notes missing embeddings via IndexerService
  - `src/modules/jobs/implementations/ValidationSweepJob.ts` - Wraps runValidation() for full graph re-validation
  - `src/modules/jobs/store/jobState.ts` - Legend-State slice for running jobs, recent history, scheduler status
  - `src/modules/jobs/store/jobActions.ts` - initializeJobs, runJobNow, stopScheduler, restartScheduler actions
  - `src/modules/jobs/components/JobsPanel.tsx` - Full panel with per-job-type status, last result summary, and manual trigger
  - `src/modules/jobs/components/JobProgress.tsx` - Animated progress bar for running jobs
  - `src/modules/jobs/index.ts` - Module barrel export
  - `src/database/migrations/012_background_jobs.ts` - job_history table with type+date and status indexes
- **Human-Centric Design**: Jobs produce actionable items (merge candidates, validation issues) for human review; only stale connection cleanup auto-modifies data (configurable via autoDelete)
- **Jobs DevSettings**: Configuration in `jobs.*`
  - `enabled` - Master switch for all background jobs (default: true)
  - `similarityScan` - Threshold, batchSize, intervalHours (default: 24h)
  - `orphanDetection` - minAgeDays, intervalHours (default: 168h / weekly)
  - `staleConnection` - autoDelete, intervalHours (default: 24h)
  - `embeddingRefresh` - batchSize, intervalHours (default: 24h)
  - `validationSweep` - intervalHours (default: 24h)

### Changed
- `src/config/devSettings.ts` - Added JobsConfig import, DEFAULT_JOBS_CONFIG, jobs observable, resetToDefaults updated, 8 job action methods
- `src/database/migrations/index.ts` - Exports setupBackgroundJobs
- `src/database/init.ts` - Calls setupBackgroundJobs during initialization
- `src/App.tsx` - Imports jobs store for window debug exposure

### Technical
- Uses `setTimeout` for scheduling (browser-friendly, not Node.js intervals)
- Job implementations delegate to existing services (SimilarityService, IndexerService, runValidation)
- Scheduler stagger: overdue jobs run with random 0-30s delay to avoid thundering herd
- Debug: `window.__ATHENA_JOBS_STATE__` and `window.__ATHENA_JOBS__`

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅
- WP 8.3: Firecrawl Integration ✅
- WP 8.4: Preference Learning ✅
- WP 8.5: Knowledge Schema Templates ✅
- WP 8.6: Background Jobs ✅

## [8.5.0] - 2026-02-01

### Added
- **Knowledge Schema Templates (WP 8.5)**: Optional schemas that guide AI extraction toward consistent entity/relationship types without enforcing rigid structure
  - `src/modules/schema/types.ts` - KnowledgeSchema, SchemaNodeType, SchemaConnectionType, SchemaConfig, CreateSchemaInput, UpdateSchemaInput
  - `src/modules/schema/data/builtInSchemas.ts` - 4 built-in schemas: Research Project, Book Notes, Meeting Notes, General Knowledge
  - `src/modules/schema/adapters/SchemaAdapter.ts` - ISchemaAdapter interface + SQLiteSchemaAdapter for CRUD operations
  - `src/modules/schema/services/SchemaService.ts` - Schema prompt building, usage tracking, active schema management
  - `src/modules/schema/store/schemaState.ts` - Legend-State slice for schemas, loading state, error tracking
  - `src/modules/schema/store/schemaActions.ts` - Load, create, update, delete, setActive, recordUsage actions
  - `src/modules/schema/components/SchemaSelector.tsx` - Dropdown selector for active schema in chat area
  - `src/modules/schema/components/SchemaEditor.tsx` - Portal dialog for creating/editing custom schemas
  - `src/modules/schema/components/SchemaHints.tsx` - Extraction hints bar displayed above chat input
  - `src/modules/schema/index.ts` - Module barrel export
  - `src/database/migrations/011_knowledge_schemas.ts` - knowledge_schemas table with built-in schema seed data
- **Schema Prompt Integration**: Active schema adds suggested entity types, relationship types, and extraction guidance to AI system prompts with soft constraints ("don't force-fit")
- **Usage Tracking**: Schema usage counts increment when extraction produces proposals, surfacing frequently-used schemas
- **Custom Schema Support**: Users can create, edit, and delete custom schemas with note types, connection types, and extraction hints
- **Schema DevSettings**: Configuration in `schema.*`
  - `enabled` - Toggle schema features (default: true)
  - `activeSchemaId` - Currently active schema ID (default: null)
  - `showHintsInChat` - Show hints above chat input (default: true)
  - `includeInPrompts` - Include schema guidance in extraction prompts (default: true)

### Changed
- `src/modules/chat/services/ChatService.ts` - Adds schema prompt addition to system prompt; records schema usage after extraction
- `src/config/devSettings.ts` - Added SchemaConfig import, DEFAULT_SCHEMA_CONFIG, schema observable, 4 schema action methods, resetToDefaults updated
- `src/database/migrations/index.ts` - Exports setupKnowledgeSchemas
- `src/database/init.ts` - Calls setupKnowledgeSchemas during initialization

### Technical
- **Soft Constraints**: Schemas suggest types but don't enforce them; AI can use free-form types when content doesn't match
- **Lazy Service Init**: SchemaAdapter and SchemaService are lazily initialized on first use via getServices()
- **Dark Theme UI**: All components use athena-* Tailwind tokens consistent with existing dark theme
- **Debug Access**: `window.__ATHENA_SCHEMA_STATE__` and `window.__ATHENA_SCHEMAS__` for console debugging

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅
- WP 8.3: Firecrawl Integration ✅
- WP 8.4: Preference Learning ✅
- WP 8.5: Knowledge Schema Templates ✅

## [8.4.0] - 2026-02-01

### Added
- **Preference Learning (WP 8.4)**: Track accept/reject patterns from AI proposals to learn user preferences and adjust confidence scores
  - `src/modules/ai/preferences/types.ts` - PreferenceSignal, PreferenceStats, ConfidenceAdjustment, PreferenceLearningConfig types
  - `src/modules/ai/preferences/PreferenceAdapter.ts` - SQLite persistence for preference signals (IPreferenceAdapter interface + SQLitePreferenceAdapter)
  - `src/modules/ai/preferences/PreferenceTracker.ts` - Records accept/reject signals from node and edge proposals
  - `src/modules/ai/preferences/ConfidenceAdjuster.ts` - Adjusts AI confidence based on acceptance rate, calibration, and relative preference factors
  - `src/modules/ai/preferences/preferenceState.ts` - Legend-State slice for preference stats and loading state
  - `src/modules/ai/preferences/preferenceActions.ts` - Public API for recording signals, adjusting confidence, refreshing stats
  - `src/modules/ai/preferences/components/PreferenceInsights.tsx` - Statistics panel showing acceptance rates, calibration quality
  - `src/modules/ai/preferences/index.ts` - Module barrel export
  - `src/database/migrations/010_preference_signals.ts` - preference_signals table with indexes
- **Confidence Adjustment Algorithm**: Three-factor adjustment system
  - Acceptance rate factor: boosts/reduces confidence based on historical accept rate per type
  - Calibration factor: detects when AI is overconfident on rejected proposals
  - Relative preference: compares note vs connection acceptance rates
- **Preference DevSettings**: Configuration in `preferences.*`
  - `enabled` - Toggle preference tracking (default: true)
  - `windowSize` - Number of recent signals to consider (default: 100)
  - `learningRate` - How much history influences adjustments, 0-1 (default: 0.3)
  - `minSignalsForAdjustment` - Minimum signals before applying adjustments (default: 10)
  - `showInsights` - Show learning insights in UI (default: true)

### Changed
- `src/modules/chat/services/ProposalAcceptService.ts` - Records preference signals on node/edge accept
- `src/modules/chat/components/NodeProposalCard.tsx` - Records preference signal on reject
- `src/modules/chat/components/EdgeProposalCard.tsx` - Records preference signal on reject
- `src/modules/chat/services/ProposalParser.ts` - Added `applyLearnedAdjustments()` function
- `src/modules/chat/services/ChatService.ts` - Applies learned confidence adjustments after proposal extraction
- `src/modules/chat/index.ts` - Exports `applyLearnedAdjustments`
- `src/config/devSettings.ts` - Added PreferenceLearningConfig interface and settings with 5 action methods
- `src/database/migrations/index.ts` - Exports setupPreferenceSignals
- `src/database/init.ts` - Calls setupPreferenceSignals during initialization

### Technical
- **No ML Required**: Simple statistical approach (acceptance rates, confidence calibration) works well for small data volumes
- **Cached Stats**: ConfidenceAdjuster caches stats for 1 minute to avoid repeated DB queries
- **Graceful Degradation**: All preference actions wrapped in try/catch; failures log warnings without breaking proposal flow
- **Privacy**: All data stored locally; `clearHistory()` method for full data deletion
- **Debug Access**: `window.__ATHENA_PREFERENCE_STATE__` and `window.__ATHENA_PREFERENCES__` for console debugging

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅
- WP 8.3: Firecrawl Integration ✅
- WP 8.4: Preference Learning ✅

## [8.3.0] - 2026-02-01

### Added
- **Firecrawl Integration (WP 8.3)**: Robust web scraping for JS-heavy sites with graceful fallback
  - `src/modules/resources/url/types.ts` - IWebScraper interface, ScrapeOptions, ScrapeResult, PageMetadata, FirecrawlApiResponse
  - `src/modules/resources/url/scrapers/FirecrawlScraper.ts` - Firecrawl API client with SecureStorage key management
  - `src/modules/resources/url/scrapers/BasicFetchScraper.ts` - Fallback HTML-to-markdown scraper using fetch
  - `src/modules/resources/url/scrapers/index.ts` - Barrel export for scrapers
  - `src/modules/resources/url/WebScraperService.ts` - Service with automatic fallback chain (Firecrawl -> basic fetch)
  - `src/modules/resources/components/FirecrawlSettings.tsx` - API key management UI with save/remove/test connection
- **Web Scraper Abstraction**: IWebScraper interface allows pluggable scrapers
  - FirecrawlScraper for JS-rendered sites, anti-bot pages, complex structures
  - BasicFetchScraper as always-available fallback with HTML-to-markdown conversion
  - WebScraperService orchestrates selection and fallback
- **Firecrawl DevSettings**: Configuration in `url.firecrawl.*`
  - `enabled` - Toggle Firecrawl on/off (default: off until API key configured)
  - `timeout` - Request timeout in ms (default: 30000)
  - `waitFor` - JS rendering wait time in ms (default: 0)
  - `autoDetectDynamic` - Auto-use Firecrawl for JS-heavy domains (default: true)
- **Extraction Method Selection**: UrlResourceDialog now offers Auto/Firecrawl/Basic fetch choice when in extract mode

### Changed
- `src/modules/resources/url/UrlResourceService.ts` - Added `extractContent()` method; `createWithExtraction()` now tries web scraping before AI fallback
- `src/modules/resources/url/index.ts` - Exports scraper types, classes, and WebScraperService
- `src/modules/resources/components/index.ts` - Exports FirecrawlSettings component
- `src/modules/sophia/components/UrlResourceDialog.tsx` - Added extraction method radio selection (Auto/Firecrawl/Basic)
- `src/store/resourceActions.ts` - `addUrlResource()` accepts `extractionPreference` parameter
- `src/config/devSettings.ts` - Added FirecrawlConfig interface and settings to UrlConfig; added 4 Firecrawl action methods

### Technical
- **API Key Security**: Firecrawl API key stored encrypted in IndexedDB via SecureStorage (never in localStorage)
- **Automatic Fallback**: Firecrawl failure transparently degrades to basic fetch
- **No New Dependencies**: Uses native fetch API and existing SecureStorage service
- **AGPL-3.0 Safe**: Uses Firecrawl hosted API only (no copyleft trigger from self-hosting)
- **Debug Access**: `window.__ATHENA_WEB_SCRAPER__()` for console debugging

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅
- WP 8.3: Firecrawl Integration ✅

## [8.2.0] - 2026-02-01

### Added
- **Document Tree Structure (WP 8.2)**: Hierarchical structure extraction for PDFs enabling reasoning-based retrieval
  - `src/modules/resources/extraction/types.ts` - DocumentTree and TreeExtractionResult types
  - `src/modules/resources/extraction/documentTree.ts` - DocumentTreeExtractor: AI-powered hierarchical structure extraction
  - `src/modules/chat/services/contextStrategies/DocumentReasoningStrategy.ts` - Reason over document trees to find relevant sections
  - `src/modules/resources/components/DocumentOutline.tsx` - Collapsible tree view of document structure in resource detail panel
  - `src/modules/resources/components/index.ts` - Barrel export for resource components
  - `src/database/migrations/009_resource_structure.ts` - Adds `structure` column to resources table
- **Reasoning-Based Retrieval**: AI navigates document tree structure to find relevant sections instead of flat similarity search
  - DocumentReasoningStrategy asks AI which sections match a query, with relevance scoring and reasoning
  - Section content extracted by title matching or page proportion estimation
- **Document Structure UI**: Expandable/collapsible outline in ResourceDetailPanel
  - Shows section titles, page ranges, and AI-generated summaries
  - Nested tree display with expand/collapse controls
- **PDF Structure DevSettings**: Configuration for structure extraction behavior
  - `resources.pdf.extractStructure` - Toggle structure extraction on/off (default: on)
  - `resources.pdf.structureModel` - Model override for extraction (empty = default)
  - `resources.pdf.maxStructureDepth` - Maximum tree nesting depth (default: 4)
  - `resources.pdf.minPagesForStructure` - Minimum pages to trigger extraction (default: 5)

### Changed
- `src/shared/types/resources.ts` - Added `structure` field to Resource interface
- `src/adapters/IResourceAdapter.ts` - Added `updateStructure()` method
- `src/adapters/sqlite/SQLiteResourceAdapter.ts` - Implemented `updateStructure()`, added `structure` to mapper
- `src/modules/resources/extraction/postExtraction.ts` - Triggers document tree extraction after PDF text extraction
- `src/modules/resources/extraction/index.ts` - Exports DocumentTreeExtractor
- `src/modules/chat/services/ContextBuilder.ts` - Added DocumentReasoningStrategy as strategy 2 (between selected and similarity)
- `src/modules/chat/services/contextStrategies/index.ts` - Exports DocumentReasoningStrategy
- `src/modules/sophia/components/ResourceDetailPanel.tsx` - Shows DocumentOutline when structure is available
- `src/config/devSettings.ts` - Added PdfConfig interface, defaults, and 4 new action methods
- `src/database/migrations/index.ts` - Added setupResourceStructure export
- `src/database/init.ts` - Calls setupResourceStructure migration

### Technical
- **One AI Call Per Upload**: Structure extraction adds one AI generation call during PDF post-extraction
- **One AI Call Per Query**: Document reasoning uses one AI call to navigate the tree per chat query
- **Non-Fatal Extraction**: Structure extraction failures don't block normal resource usage
- **Section Content Extraction**: Two strategies - title matching in text, or page proportion estimation
- **Tree Stats**: Tracks section count and max depth for debugging
- **Debug Access**: `window.__ATHENA_TREE_EXTRACTOR__` for console debugging

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅
- WP 8.2: Document Tree Structure ✅

## [8.1.0] - 2026-02-01

### Added
- **Entity Resolution / Merge Candidates (WP 8.1)**: Detect and merge duplicate/near-duplicate notes
  - `src/modules/similarity/types.ts` - Type definitions (SimilarityWeights, MergeCandidate, MergeOptions, etc.)
  - `src/modules/similarity/algorithms/jaroWinkler.ts` - Jaro-Winkler string similarity for titles
  - `src/modules/similarity/algorithms/levenshtein.ts` - Levenshtein edit distance normalized to 0-1
  - `src/modules/similarity/algorithms/combined.ts` - Weighted combination scorer with graceful degradation
  - `src/modules/similarity/adapters/MergeCandidateAdapter.ts` - SQLite adapter with IMergeCandidateAdapter interface
  - `src/modules/similarity/services/SimilarityService.ts` - Scan all/single notes, progress reporting, abort support
  - `src/modules/similarity/services/MergeService.ts` - Merge execution with content strategy, connection/cluster transfer
  - `src/modules/similarity/store/similarityState.ts` - Legend-State slice for candidates, scan progress, filter state
  - `src/modules/similarity/store/similarityActions.ts` - Actions: scanAll, scanNote, merge, reject, abortScan
  - `src/modules/similarity/hooks/useMergeCandidates.ts` - Subscribe to candidates list with filtering
  - `src/modules/similarity/hooks/useMerge.ts` - Merge/reject operations with isMerging state
  - `src/modules/similarity/hooks/useSimilaritySettings.ts` - Subscribe to DevSettings similarity section
  - `src/modules/similarity/hooks/useSimilarityPanel.ts` - Panel state with Ctrl+Shift+M keyboard shortcut
  - `src/modules/similarity/components/MergeCandidatesPanel.tsx` - Main panel with scan, filter, candidate list
  - `src/modules/similarity/components/CandidateCard.tsx` - Card with score badge, titles, score breakdown
  - `src/modules/similarity/components/NoteComparisonView.tsx` - Side-by-side comparison dialog
  - `src/modules/similarity/components/MergeDialog.tsx` - Merge confirmation with options (primary, strategy, transfers)
  - `src/modules/similarity/components/SimilarityBadge.tsx` - Color-coded score badge (red/amber/blue)
  - `src/database/migrations/008_merge_candidates.ts` - Creates merge_candidates and similarity_scans tables
- **Similarity Algorithms**: Three-signal scoring system
  - Jaro-Winkler for short string comparison (titles)
  - Levenshtein with two-row optimization for content
  - Cosine similarity for embedding vectors
  - Weighted combination with configurable weights (default: 0.3/0.3/0.4)
- **Graceful Degradation**: When embeddings are missing for notes, weights redistribute proportionally to title+content only
- **Merge Workflow**: Human-in-the-loop approval process
  - Scan detects candidates above threshold
  - Compare side-by-side with score breakdown
  - Choose primary note, content strategy, and transfer options
  - Merge transfers connections and clusters, soft-deletes secondary
- **Similarity DevSettings**: Configuration for detection and merge behavior
  - `similarity.enabled` - Toggle similarity detection
  - `similarity.threshold` - Minimum combined score (default: 0.85)
  - `similarity.runOnNoteCreate` - Auto-scan new notes
  - `similarity.weights` - Title/content/embedding weight distribution
  - `similarity.merge.defaultContentStrategy` - Default merge content strategy
  - `similarity.merge.transferConnections` - Default connection transfer toggle
  - `similarity.merge.transferClusters` - Default cluster transfer toggle

### Changed
- `src/database/migrations/index.ts` - Added setupMergeCandidates export
- `src/database/init.ts` - Calls setupMergeCandidates migration
- `src/config/devSettings.ts` - Added SimilarityConfig interface, defaults, observable section, 5 new actions
- `src/app/layout/AppLayout.tsx` - Added MergeCandidatesPanel and useSimilarityPanel hook

### Technical
- **Consistent ID Ordering**: Candidate pairs stored with `note_a_id < note_b_id` to prevent (A,B)/(B,A) duplicates
- **Lazy Service Initialization**: Services instantiated on first panel open via `initSimilarityServices()`
- **Content Strategies**: `keep_primary`, `concatenate`, `keep_secondary` for merge content handling
- **Connection Transfer**: Uses `getConnectionsFor()` to find all connections, remaps source/target IDs
- **Cluster Transfer**: Uses `getClustersForEntity()` and `addMember()`/`removeMember()` for membership transfer
- **Portal Rendering**: Panel and dialogs use `createPortal()` for proper z-index handling

### Phase 8 Progress
- WP 8.1: Entity Resolution / Merge Candidates ✅

## [7.6.0] - 2026-01-25

### Added
- **Spatial Awareness (WP 7.6)**: Reference existing notes in chat conversations
  - `src/modules/chat/components/MentionInput.tsx` - Enhanced input with @autocomplete
  - `src/modules/chat/components/MentionSuggestions.tsx` - Dropdown with keyboard navigation
  - `src/modules/chat/components/ContextChips.tsx` - Context display bar with add/remove
  - `src/modules/chat/hooks/useMentions.ts` - @mention parsing with fuzzy search
  - `src/modules/chat/hooks/useCanvasSelection.ts` - Bridge canvas selection to chat
- **@Mentions**: Type `@` to trigger autocomplete dropdown
  - Fuzzy search over note titles
  - Shows recent notes when @ typed without query
  - Arrow keys navigate, Enter/Tab select, Escape close
  - Selecting inserts `@[Title] ` and adds note to thread context
- **Context Chips Bar**: Visual display of notes in current thread's context
  - Blue chips with note titles
  - X button to remove from context
  - "Add selected" button appears when canvas has selection
  - Count indicator (e.g., "3 notes")
- **Mentions DevSettings**: Configuration for autocomplete behavior
  - `chat.mentions.enabled` - Toggle @mention feature
  - `chat.mentions.maxSuggestions` - Maximum suggestions (default: 8)
  - `chat.mentions.showRecentOnEmpty` - Show recent notes on bare @
  - `chat.mentions.fuzzyMatch` - Enable fuzzy matching
- **Spatial Context DevSettings**: Configuration for context chips
  - `chat.spatialContext.showContextChips` - Toggle context bar
  - `chat.spatialContext.showAddSelectedButton` - Toggle add selected button
  - `chat.spatialContext.maxContextItems` - Maximum context items per thread

### Changed
- `src/modules/chat/components/ChatPanel.tsx` - Now uses MentionInput and includes ContextChips
- `src/modules/chat/components/index.ts` - Exports new components
- `src/modules/chat/index.ts` - Exports new hooks and components
- `src/config/devSettings.ts` - Added MentionsConfig and SpatialContextConfig interfaces

### Technical
- **Fuzzy Matching**: Characters of query appear in target in order
- **Scoring Algorithm**: Exact prefix (100) > word boundary (80) > contains (60) > fuzzy (40)
- **Context Persistence**: `contextNodeIds` persisted with thread to IndexedDB
- **Canvas Bridge**: `useCanvasSelection` hook reads from `appState$.ui.selectedEntityIds`

### Phase 7 Complete
- WP 7.1: Chat UI & State ✅
- WP 7.2: Context Builder ✅
- WP 7.3: Conversational Generation ✅
- WP 7.4: Extraction Parser ✅
- WP 7.5: Proposal Cards ✅
- WP 7.6: Spatial Awareness ✅

**Phase 7 (AI Chat - Knowledge Capture Interface) is now complete!**

ATHENA transforms from passive repository to active knowledge capture partner:
1. User opens chat (Ctrl+Shift+C)
2. References notes via @mentions or canvas selection
3. Asks questions or discusses topics
4. AI responds with context-aware answers
5. AI proposes new notes/connections
6. User accepts relevant proposals
7. Knowledge graph grows through conversation

## [7.4.0] - 2026-01-25

### Added
- **Knowledge Extraction Parser (WP 7.4)**: Parse AI proposals from responses with self-correction
  - `src/modules/chat/services/proposalSchema.ts` - Zod schemas for validation
  - `src/modules/chat/services/ProposalParser.ts` - Fast extraction path
  - `src/modules/chat/services/SelfCorrectingExtractor.ts` - Recovery with LLM feedback
- **Self-Correction Pattern**: From PageIndex analysis, proven effective
  - Retries extraction up to 3 times on failure
  - Sends error details to LLM for correction
  - Achieves higher extraction reliability
- **Title Resolution**: Connect proposals to existing knowledge graph
  - `resolveProposalReferences()` - Maps titles to existing note/resource IDs
  - Case-insensitive matching
  - Resolves edge endpoints and suggestedConnections
- **Extraction DevSettings**: Configuration for parsing behavior
  - `chat.extraction.enableSelfCorrection` - Toggle recovery path (default: true)
  - `chat.extraction.maxCorrectionAttempts` - Retry limit (default: 3)
  - `chat.extraction.minConfidenceThreshold` - Filter low-confidence proposals (default: 0.5)
- **Proposal Indicator**: Lightbulb indicator in chat messages showing proposal counts

### Changed
- `src/modules/chat/services/ChatService.ts` - Integrates extraction pipeline
  - Parses proposals after streaming completes
  - Falls back to self-correction on parse failure
  - Resolves title references to existing nodes
  - Filters low-confidence proposals
  - Strips proposal block from display content
- `src/modules/chat/components/ChatMessage.tsx` - Shows proposal count indicator
- `src/modules/chat/components/ChatServiceInitializer.tsx` - Passes adapters for resolution
- `src/config/devSettings.ts` - Added ExtractionConfig interface and settings
- `src/modules/chat/index.ts` - Added exports for extraction services and types

### Technical
- **Hybrid Extraction**: Fast path for valid JSON, self-correction for malformed
- **Zod Validation**: Type-safe parsing with detailed error messages
- **Proposal Block Stripping**: Clean display without JSON artifacts
- **Deep Copy**: Resolved proposals don't mutate originals
- **Confidence Filtering**: Proposals below threshold are filtered out

### Dependencies
- Added `zod` for schema validation

### Debug
- Extraction logs in console: `[ChatService]`, `[SelfCorrectingExtractor]`

### Phase 7 Progress
- WP 7.1: Chat UI & State ✅
- WP 7.2: Context Builder ✅
- WP 7.3: Conversational Generation ✅
- WP 7.4: Extraction Parser ✅
- WP 7.5: Proposal Cards ⏳
- WP 7.6: Spatial Awareness ⏳

## [7.3.0] - 2026-01-23

### Added
- **Conversational Generation (WP 7.3)**: Real AI integration with streaming responses
  - `src/modules/chat/services/ChatService.ts` - Main chat orchestrator
  - `src/modules/chat/services/promptTemplates.ts` - System prompts for knowledge capture
  - `src/modules/chat/components/ChatServiceInitializer.tsx` - Initialization component
- **AI Streaming**: Server-Sent Events streaming for LLM responses
  - `AIService.generateStream()` - Streaming generation method
  - `GeminiBackend.generateStream()` - Gemini SSE implementation
  - `AIChatMessage`, `StreamOptions`, `StreamResult` types
- **Knowledge Capture Prompt**: System prompt guiding AI to propose knowledge
  - Structured `athena-proposals` format for nodes and edges
  - Context injection from ContextBuilder
  - Simple chat prompt (without proposals) option
- **Generation DevSettings**: Configuration for AI generation
  - `chat.generation.enableProposals` - Toggle proposal suggestions
  - `chat.generation.historyLimit` - Conversation history limit (default: 10)
  - `chat.generation.temperature` - AI temperature setting (default: 0.7)
  - `chat.generation.maxTokens` - Maximum response tokens (default: 2048)

### Changed
- `src/modules/ai/types.ts` - Added AIChatMessage, StreamOptions, StreamResult types
- `src/modules/ai/types.ts` - Added `generateStream()` to IAIBackend interface
- `src/modules/ai/AIService.ts` - Added `generateStream()` method
- `src/modules/ai/backends/GeminiBackend.ts` - Implements SSE streaming
- `src/modules/chat/components/ChatInput.tsx` - Wired to ChatService
- `src/modules/chat/components/ChatMessages.tsx` - Shows streaming content with cursor animation
- `src/config/devSettings.ts` - Added GenerationConfig interface and chat.generation settings
- `src/App.tsx` - Added ChatServiceInitializer inside AIProvider
- `src/modules/chat/index.ts` - Added exports for ChatService and prompt templates

### Technical
- **SSE Parsing**: Handles Gemini's streaming format with proper buffering
- **Context Integration**: Uses ContextBuilder from WP 7.2 to gather relevant notes
- **Error Handling**: Graceful error display in chat messages
- **Loading States**: Animated dots before first chunk, blinking cursor during stream
- **Conversation History**: Includes last N messages (configurable) for context

### Debug
- `window.__ATHENA_CHAT_SERVICE__` - Chat service instance

### Phase 7 Progress (at this version)
- WP 7.1: Chat UI & State ✅
- WP 7.2: Context Builder ✅
- WP 7.3: Conversational Generation ✅
- WP 7.4: Extraction Parser ⏳
- WP 7.5: Proposal Cards ⏳
- WP 7.6: Spatial Awareness ⏳

## [7.2.0] - 2026-01-23

### Added
- **Context Builder (WP 7.2)**: GraphRAG context gathering for AI conversations
  - `src/modules/chat/services/ContextBuilder.ts` - Main orchestrator
  - `src/modules/chat/services/ContextFormatter.ts` - Format for AI prompts
  - `src/modules/chat/services/contextStrategies/` - Strategy implementations
- **Three Context Strategies**:
  - `SelectedNodesStrategy` - Explicit user-selected context (relevanceScore: 1.0)
  - `SimilarityStrategy` - Semantic similarity search using embeddings
  - `TraversalStrategy` - Graph neighborhood expansion (1-hop, relevanceScore: 0.5)
- **Context DevSettings**: Configuration for context building
  - `chat.context.maxItems` - Maximum context items (default: 10)
  - `chat.context.similarityThreshold` - Minimum similarity score (default: 0.7)
  - `chat.context.includeTraversal` - Enable graph traversal (default: true)
  - `chat.context.traversalDepth` - Traversal hops (default: 1)
- **Context Types**: Type definitions for context building
  - `ContextItem` - Single item with id, type, title, content, relevanceScore, source
  - `ContextOptions` - Options for context building
  - `ContextResult` - Result with items, token estimate, debug info

### Changed
- `src/config/devSettings.ts` - Added ContextConfig interface and chat.context settings
- `src/modules/chat/index.ts` - Added exports for ContextBuilder, ContextFormatter, types
- `src/modules/chat/services/index.ts` - Added exports for new services

### Technical
- **Strategy Pattern**: Clean composition of context gathering strategies
- **Deduplication**: Items appear once even if found by multiple strategies
- **Priority Order**: Selected > Similar > Traversal (by relevance score)
- **Token Estimation**: Rough estimate for context window planning (~4 chars/token)
- **Graceful Degradation**: Handles AI/embedding failures without crashing

### Debug
- `window.__ATHENA_CONTEXT_BUILDER__` - Context builder instance (set by ChatService in WP 7.3)

### Phase 7 Progress
- WP 7.1: Chat UI & State ✅
- WP 7.2: Context Builder ✅
- WP 7.3: AI Generation Service ⏳
- WP 7.4: Extraction Parser ⏳
- WP 7.5: Proposal Cards ⏳
- WP 7.6: Spatial Awareness ⏳

## [7.1.0] - 2026-01-23

### Added
- **Chat Module (WP 7.1)**: Slide-over chat panel for conversational knowledge capture
  - `src/modules/chat/types/index.ts` - ChatMessage, ChatThread, ChatState types
  - `src/modules/chat/store/chatState.ts` - Legend-State slice for chat
  - `src/modules/chat/store/chatActions.ts` - Thread/message CRUD actions
  - `src/modules/chat/services/ChatPersistence.ts` - IndexedDB persistence
  - `src/modules/chat/components/ChatPanel.tsx` - Main slide-over container
  - `src/modules/chat/components/ChatHeader.tsx` - Thread title and controls
  - `src/modules/chat/components/ChatMessages.tsx` - Message list with auto-scroll
  - `src/modules/chat/components/ChatMessage.tsx` - Single message display
  - `src/modules/chat/components/ChatInput.tsx` - Text input with send button
  - `src/modules/chat/components/ChatToggleButton.tsx` - Floating toggle button
- **Chat Persistence**: IndexedDB storage for threads and messages
  - `athena-chat` database with `threads` and `messages` object stores
  - Threads indexed by `updatedAt`, messages indexed by `threadId`
  - Auto-loads on app start, persists across sessions
- **Chat DevSettings**: Configuration options for chat behavior
  - `chat.enabled` - Toggle chat panel visibility
  - `chat.position` - Panel position (right/left)
  - `chat.defaultWidth` - Panel width in pixels
  - `chat.persistHistory` - Enable/disable persistence
  - `chat.showToggleButton` - Show/hide floating button
- **Keyboard Shortcut**: `Ctrl+Shift+C` to toggle chat panel

### Changed
- `src/app/layout/AppLayout.tsx` - Added ChatPanel and ChatToggleButton
- `src/App.tsx` - Added chat initialization (loadThreads on startup)
- `src/config/devSettings.ts` - Added ChatConfig interface and chat settings

### Technical
- **Thread Management**: Create, switch, delete threads with auto-selection
- **Message Flow**: User message → placeholder AI response (WP 7.3 will add real AI)
- **Auto-scroll**: Messages container scrolls to bottom on new messages
- **Panel State**: Open/close state managed in Legend-State store
- **Context Nodes**: `contextNodeIds` field prepared for WP 7.6 spatial awareness

### Debug
- `window.__ATHENA_CHAT_STATE__` - Chat state (threads, messages, panel)
- `window.__ATHENA_CHAT__` - Chat actions for testing

### Phase 7 Progress (at this version)
- WP 7.1: Chat UI & State ✅
- WP 7.2: Context Builder ⏳
- WP 7.3: AI Generation Service ⏳
- WP 7.4: Extraction Parser ⏳
- WP 7.5: Proposal Cards ⏳
- WP 7.6: Spatial Awareness ⏳

## [6.6.0] - 2026-01-23

### Added
- **URL Resources**: Add URLs as first-class resources with two modes
  - `src/modules/sophia/components/UrlResourceDialog.tsx` - Dialog for adding URL resources
  - `src/modules/sophia/components/UrlAddButton.tsx` - Sidebar button to open URL dialog
  - `src/modules/resources/url/UrlResourceService.ts` - URL creation logic for both modes
- **Reference Mode**: Bookmark-only, instant (no AI required)
  - Stores URL and user notes
  - Sets `extractionStatus: 'skipped'`
  - No external API calls
- **AI Extract Mode**: Sends URL to AI for fetching and summarization
  - Gemini fetches and analyzes page content
  - Extracts title, summary, and key points
  - Stores extracted text for search
  - Generates embeddings for semantic search
- **URL Config in DevSettings**: Configuration for URL handling
  - `url.defaultMode` - 'reference' or 'extracted' (default: reference)
  - `url.autoExtract` - Force extraction mode (default: false)
  - `devSettingsActions.setUrlDefaultMode()` and `setUrlAutoExtract()`

### Changed
- `src/store/resourceActions.ts` - Added `addUrlResource()` action
- `src/store/hooks.ts` - Exports `addUrlResource`
- `src/store/index.ts` - Exports `addUrlResource`
- `src/app/layout/Sidebar.tsx` - Added UrlAddButton next to ResourceUploadButton
- `src/config/devSettings.ts` - Added UrlConfig interface and url settings
- `src/modules/sophia/components/ResourceDetailPanel.tsx` - Shows URL mode (Reference/AI Extracted)
- `src/modules/sophia/components/index.ts` - Exports UrlResourceDialog and UrlAddButton

### Technical
- **URL Title Extraction**: Parses URL path for meaningful name, falls back to hostname
- **Graceful AI Fallback**: If AI unavailable in extract mode, creates resource with `extractionStatus: 'failed'`
- **Post-Extraction Pipeline**: URL resources with extracted text get embeddings for semantic search
- **No Blob Storage**: URL resources use `storageType: 'url'` - URL itself is the reference

### Phase 6 Complete
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Resource Upload & Storage ✅
- WP 6.3: Resource Nodes on Canvas ✅
- WP 6.4: Browser Extraction + FTS + Embeddings ✅
- WP 6.5: AI Extraction (PDF, images) + Unified Search ✅
- WP 6.6: URL Resources ✅

**Phase 6 delivers: "The Second Brain with Rich Media"**

## [6.5.0] - 2026-01-23

### Added
- **AI Extraction Module**: AI-powered text extraction for PDFs and images using Gemini multimodal
  - `src/modules/resources/extraction/AIExtractionService.ts` - Orchestrates AI-based extraction
  - Uses Gemini 2.5 Flash for vision/document understanding
  - PDF extraction: Full text with structure preservation
  - Image extraction: OCR for visible text + visual description
  - File size limit (configurable, default 10MB)
- **Multimodal AI Support**: Extended AI backend for vision capabilities
  - `GenerateWithAttachmentOptions` type for multimodal requests
  - `IAIBackend.generateWithAttachment()` optional method
  - `IAIService.generateWithAttachment()` for service-level access
  - `IAIService.supportsMultimodal()` capability check
  - `GeminiBackend.generateWithAttachment()` implementation
- **Extraction Strategy Settings**: Configurable extraction behavior
  - `resources.extraction.strategy` - 'browser' | 'ai' | 'browser-then-ai'
  - `resources.extraction.aiEnabled` - Master toggle for AI extraction
  - `resources.extraction.maxFileSizeMB` - File size limit for AI
  - Default: 'browser-then-ai' for best of both worlds
- **Unified Search (Command Palette)**: Search now includes resources
  - `useCommandPalette.ts` - Searches both entities AND resources in parallel
  - Resource results shown with amber "resource" badge
  - Type-specific icons for resources (PDF=red file, image=blue, etc.)
  - Clicking resource result selects it on canvas
- **FTS Debug Helper**: Console function to check FTS index status
  - `window.__ATHENA_FTS_DEBUG__()` - Returns resource count, FTS count, and sample entries

### Changed
- `src/modules/ai/types.ts` - Added AttachmentInput and GenerateWithAttachmentOptions
- `src/modules/ai/AIService.ts` - Added generateWithAttachment and supportsMultimodal methods
- `src/modules/ai/backends/GeminiBackend.ts` - Implements multimodal generation, uses gemini-2.5-flash default
- `src/config/devSettings.ts` - Added ExtractionStrategy type and extraction config
- `src/modules/resources/extraction/BrowserExtractionService.ts` - Strategy-based routing with AI fallback
- `src/modules/search/hooks/useCommandPalette.ts` - Now searches resources via `searchResources()`
- `src/modules/search/components/CommandPalette.tsx` - Resource icons, badges, and selection handling
- `src/adapters/index.ts` - Exports `ResourceSearchResult` type
- `src/database/init.ts` - Added `debugFTSStatus()` helper exposed as `__ATHENA_FTS_DEBUG__`
- `src/database/schema.ts` - Made `entity_id` nullable in embeddings table, added `resource_id` column

### Technical
- **Strategy-Based Routing**: BrowserExtractionService routes to appropriate extractor
  - Browser-first for DOCX/XLSX/MD (fast, local)
  - AI fallback for PDF/images (requires API key)
  - Configurable via DevSettings
- **Base64 Encoding**: Files converted to base64 for Gemini API
- **Prompt Engineering**: Type-specific prompts for OCR vs document extraction
- **Graceful Degradation**: Falls back gracefully if AI unavailable
- **Unified Search**: Command Palette runs `hybridSearch()` and `searchResources()` in parallel
- **Resource Result Handling**: `CommandPaletteResult.isResource` flag determines selection behavior

### Debug
- `window.__ATHENA_AI_EXTRACTION__` - AI extraction service instance
- `window.__ATHENA_FTS_DEBUG__()` - Check FTS index status (resource count, FTS count, samples)

### Phase 6 Progress
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Resource Upload & Storage ✅
- WP 6.3: Resource Nodes on Canvas ✅
- WP 6.4: Browser Extraction + FTS + Embeddings ✅
- WP 6.5: AI Extraction (PDF, images) + Unified Search ✅
- WP 6.6: URL Resources ⏳

## [6.4.0] - 2026-01-18

### Added
- **Browser Extraction Module**: Client-side text extraction for DOCX, XLSX, and MD files
  - `src/modules/resources/extraction/types.ts` - ExtractionResult and IExtractor interfaces
  - `src/modules/resources/extraction/extractors/DocxExtractor.ts` - DOCX to text using mammoth.js
  - `src/modules/resources/extraction/extractors/XlsxExtractor.ts` - Excel parsing using SheetJS
  - `src/modules/resources/extraction/extractors/MarkdownExtractor.ts` - Direct text passthrough
  - `src/modules/resources/extraction/BrowserExtractionService.ts` - Orchestrates extraction flow
  - `src/modules/resources/extraction/postExtraction.ts` - Generates embeddings after extraction
- **Resources FTS5**: Full-text search for resources
  - `src/database/migrations/resources_fts.ts` - FTS5 virtual table for resources
  - Indexes: name, user_notes, extracted_text with porter unicode61 tokenizer
  - Sync triggers: INSERT, UPDATE, DELETE, soft-delete
- **Resource Embeddings**: Semantic search for resources
  - `src/database/migrations/embeddings_resources.ts` - Adds resource_id column to embeddings
  - `ResourceEmbeddingRecord` and `ResourceSimilarityResult` types
  - `IEmbeddingAdapter.storeForResource()` - Store embeddings for resources
  - `IEmbeddingAdapter.findSimilarResources()` - Semantic search for resources
- **Resource Search Methods**: Keyword and semantic search for resources
  - `ResourceSearchResult` type in ISearchAdapter
  - `SQLiteSearchAdapter.searchResources()` - FTS5 keyword search for resources
  - `SQLiteSearchAdapter.semanticSearchResources()` - Vector similarity search for resources
- **Auto-Extraction on Upload**: Resources are automatically extracted after upload
  - `uploadResource()` now triggers `browserExtractionService.extract()` for supported types

### Changed
- `src/database/init.ts` - Runs resources FTS and embeddings migrations
- `src/database/migrations/index.ts` - Exports new migrations
- `src/adapters/IEmbeddingAdapter.ts` - Added resource methods to interface
- `src/adapters/sqlite/SQLiteEmbeddingAdapter.ts` - Implements resource embedding methods
- `src/adapters/ISearchAdapter.ts` - Added ResourceSearchResult type and resource search methods
- `src/adapters/sqlite/SQLiteSearchAdapter.ts` - Implements resource search methods
- `src/shared/types/embeddings.ts` - Added ResourceEmbeddingRecord and ResourceSimilarityResult
- `src/store/resourceActions.ts` - Auto-triggers extraction after upload

### Dependencies
- `mammoth` (^1.6.0) - DOCX to text extraction
- `xlsx` (^0.18.5) - Excel file parsing (SheetJS)

### Technical
- **Extractor Pattern**: IExtractor interface with canExtract() and extract() methods
- **Async Extraction**: Upload completes immediately, extraction runs in background
- **FTS5 Triggers**: Same pattern as entities_fts for automatic sync
- **Embedding Storage**: Resources stored with resource_id instead of entity_id

### Phase 6 Progress
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Resource Upload & Storage ✅
- WP 6.3: Resource Nodes on Canvas ✅
- WP 6.4: Browser Extraction + FTS + Embeddings ✅
- WP 6.5: AI Extraction (PDF, images) ⏳

## [6.3.0] - 2026-01-18

### Added
- **Resource Nodes on Canvas**: Resources now appear as graph nodes alongside entities
  - `src/modules/canvas/components/ResourceNode.tsx` - Custom React Flow node for resources
  - Type-specific icons (FileText for PDF/DOCX/MD, FileSpreadsheet for XLSX, Image, Link)
  - Extraction status badge (pending/complete/failed/skipped)
  - File size display
- **Resource Color Schemes**: Two color modes for resource nodes
  - `src/shared/theme/resourceColors.ts` - Per-type and unified color schemes
  - Per-type mode: Each resource type has distinct colors (PDF=red, DOCX=blue, XLSX=green, etc.)
  - Unified mode: All resources use violet/purple color scheme
  - Toggle via DevSettings: `resources.nodeColorScheme`
- **Resource Config in DevSettings**: Configuration for resource display
  - `resources.enabled` - Toggle resource nodes on/off
  - `resources.nodeColorScheme` - 'per-type' or 'unified' color scheme
  - UI section added to `DevSettingsPanel.tsx` under "Resources (Phase 6)"
- **Resource-Aware Connections**: Create connections between entities and resources
  - Updated `useConnectionsAsEdges.ts` - Handles `resource-` prefixed node IDs
  - Updated `useConnectionHandlers.ts` - Detects node type and sets source_type/target_type
  - Entity↔resource and resource↔resource connections fully supported
- **Resource Detail Panel**: View and edit resource metadata
  - `src/modules/sophia/components/ResourceDetailPanel.tsx` - Resource detail view
  - Shows: name, type, size, added date, extraction status
  - User notes textarea for annotations
  - Download button for blob-stored resources
  - Delete button with confirmation
- **Resource Nodes Hook**: Convert resources to React Flow nodes
  - `src/modules/canvas/hooks/useResourcesAsNodes.ts` - Transforms resources to nodes
  - Uses `resource-{id}` prefix to avoid ID collision with entities
  - Default grid positions offset from entity nodes
- **Resource Selection Hook**: Check if specific resource is selected
  - `useIsResourceSelected(id)` - Returns boolean for selection state

### Changed
- **GraphCanvas.tsx**: Now renders both entity and resource nodes
  - Combines `entityNodes` and `resourceNodes` into single array
  - Node click handler detects type by ID prefix and routes appropriately
  - Drag stop handler persists resource positions to SQLite
  - Pane click clears both entity and resource selection
  - MiniMap shows resource nodes with type-specific colors
- **SophiaPage.tsx**: Shows resource detail when resource selected
  - Conditionally renders `ResourceDetailPanel` or `EntityDetail`
  - Uses `useSelectedResourceId()` to determine which panel to show
- **StoreInitializer.tsx**: Loads resources on app initialization
  - Added `resourceAdapter` to initialization options
  - Resources loaded alongside entities, connections, and clusters
- **useInitializeStore.ts**: Now accepts and uses resource adapter
  - Sets resource adapter for actions module
  - Loads all resources into state on init

### Technical
- **Node ID Prefixing**: Resource nodes use `resource-{uuid}` format
  - Prevents ID collision with entity UUIDs
  - `parseNodeId()` helper extracts type and ID from React Flow node ID
- **Mixed Node Canvas**: Single canvas with heterogeneous node types
  - `nodeTypes` map includes both `entity` and `resource` types
  - All handlers check node ID prefix to determine type
- **Position Persistence**: Resource positions saved to SQLite
  - Uses `updateResource()` with `positionX`/`positionY`

### Phase 6 Progress
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Resource Upload & Storage ✅
- WP 6.3: Resource Nodes on Canvas ✅
- WP 6.4: Text Extraction (Browser) ⏳

## [6.2.0] - 2026-01-18

### Added
- **Blob Storage Service**: IndexedDB-based binary file storage
  - `src/services/blobStorage/IBlobStorage.ts` - Interface for blob operations
  - `src/services/blobStorage/BlobStorageService.ts` - IndexedDB implementation
  - `src/services/blobStorage/index.ts` - Exports with singleton instance
- **Resource State Management**: Legend-State integration for resources
  - `src/store/resourceState.ts` - Observable state slice for resources
  - `src/store/resourceActions.ts` - Upload, delete, and retrieval actions
  - Added `useResources`, `useResource`, `useResourcesLoading` hooks
  - Added `uploadResource`, `deleteResource`, `getResourceBlob` actions
- **Upload Dialog UI**: Drag-and-drop file upload interface
  - `src/modules/sophia/components/ResourceUploadDialog.tsx` - Modal dialog component
  - `src/modules/sophia/components/ResourceUploadButton.tsx` - Trigger button
  - File validation (50MB max, supported types only)
  - Progress indicator during upload
  - User notes field for annotations

### Changed
- `src/app/layout/Sidebar.tsx` - Added ResourceUploadButton next to Notes header
- `src/store/hooks.ts` - Added resource hooks and action exports
- `src/store/index.ts` - Added resource state and action exports
- `src/modules/sophia/components/index.ts` - Added ResourceUploadDialog and ResourceUploadButton exports

### Technical
- **Dual Storage Pattern**: SQLite metadata + IndexedDB blobs
  - Resource records in SQLite with `storage_key` reference
  - Binary file content in IndexedDB `athena-blobs` database
  - Coordinated deletion removes both records
- **Upload Flow**: File → IndexedDB → SQLite → State
  - Blob stored first, storage key captured
  - Resource record created with storage key
  - State updated with new resource

### File Types Supported
| Type | MIME Types | Extensions |
|------|------------|------------|
| PDF | application/pdf | .pdf |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | .xlsx, .xls |
| Markdown | text/markdown | .md |
| Images | image/jpeg, image/png, image/gif, image/webp | .jpg, .jpeg, .png, .gif, .webp |

### Phase 6 Progress
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Resource Upload & Storage ✅
- WP 6.3: Canvas Display ⏳
- WP 6.4: Text Extraction (Browser) ⏳

## [6.1.0] - 2026-01-18

### Added
- **Resource Schema & Types**: Data foundation for resources (Phase 6)
  - `src/shared/types/resources.ts` - Resource type definitions (ResourceType, StorageType, ExtractionStatus, etc.)
  - `src/database/migrations/006_resources.ts` - Resources table with bi-temporal support
  - `src/database/migrations/007_connections_v2.ts` - Adds source_type/target_type to connections
  - `src/adapters/IResourceAdapter.ts` - Interface for resource CRUD and queries
  - `src/adapters/sqlite/SQLiteResourceAdapter.ts` - SQLite implementation
- **Unified Connections**: Connections now support entity↔entity, entity↔resource, and resource↔resource
  - `NodeType` union type: `'entity' | 'resource'`
  - `Connection.source_type` and `Connection.target_type` fields
  - `IConnectionAdapter.getForNode()` - Find all connections for a node regardless of type
- **Resource Adapter Hooks**: React integration for resources
  - `useResourceAdapter()` hook for accessing resource adapter
  - Added to AdapterContext and AdapterProvider

### Changed
- `src/shared/types/connections.ts` - Added NodeType and source_type/target_type to Connection
- `src/adapters/IConnectionAdapter.ts` - Added `getForNode(nodeType, nodeId)` method
- `src/adapters/sqlite/SQLiteConnectionAdapter.ts` - Implements getForNode, stores source_type/target_type
- `src/database/init.ts` - Runs new migrations (setupResources, upgradeConnections)
- `src/App.tsx` - Instantiates SQLiteResourceAdapter

### Technical
- **Migration Safety**: Existing connections preserved with `source_type='entity'` and `target_type='entity'` defaults
- **Bi-temporal Resources**: Resources use `valid_at`/`invalid_at` for soft delete pattern
- **Indexed Lookups**: New composite indexes on `(source_type, source_id)` and `(target_type, target_id)`

### Resource Types Supported
| Type | Storage | Purpose |
|------|---------|---------|
| pdf | blob | PDF documents |
| docx | blob | Word documents |
| xlsx | blob | Excel spreadsheets |
| md | inline | Markdown files |
| image | blob | Images (PNG, JPG, etc.) |
| url | url | Web references |

### Phase 6 Progress (as of 6.1)
- WP 6.1: Resource Schema & Types ✅
- WP 6.2: Drag-and-Drop + Upload ⏳
- WP 6.3: Canvas Display ⏳
- WP 6.4: Text Extraction (Browser) ⏳

## [5.6.0] - 2026-01-18

### Added
- **Validation Panel UI**: Sidebar panel for managing violations (Ctrl+Shift+V)
  - `ValidationPanel.tsx` - Main floating panel component
  - `ValidationSummary.tsx` - Header showing validation status and run button
  - `ViolationFilters.tsx` - Severity and rule filter dropdowns
  - `ViolationList.tsx` - Grouped list with collapsible error/warning sections
  - `ViolationCard.tsx` - Individual violation card with Show/Fix/Dismiss actions
  - `useValidationPanel.ts` - Hook for panel state with keyboard shortcut

### Changed
- **AppLayout.tsx**: Integrated validation panel as floating overlay
  - Toggle with Ctrl+Shift+V keyboard shortcut
  - Panel appears on right side of screen
  - ESC key or backdrop click to close

### Features
- **Run Validation**: Button to trigger validation and update violation counts
- **Filter Violations**: By severity (errors/warnings) or by rule type
- **Show on Canvas**: Click "Show" to navigate to and select the affected entity
- **Auto-Fix**: Click "Fix" on violations with auto-applicable suggestions
- **Dismiss**: Mark violations as dismissed (won't reappear on next run)
- **Grouped Display**: Violations grouped by severity with collapsible sections

### Technical
- Uses portal rendering for floating panel overlay
- Respects Legend-State reactivity for violation updates
- Entity titles resolved from notes store
- Connection violations show source → target format

### Fixed
- **GraphCanvas.tsx**: Wrapped component with `ReactFlowProvider` to enable external navigation
  - "Show" button in validation panel now correctly centers canvas on selected node
  - Created `ExternalSelectionHandler` component inside ReactFlow context
  - Tracks internal vs external selection to avoid unnecessary centering on node clicks
  - Also fixes Search Panel's "Show on Canvas" functionality

### Phase 5A Complete
- WP 5.1: Validation Types ✅
- WP 5.2: Rules Engine ✅
- WP 5.3: MVP Validation Rules ✅
- WP 5.4: Validation Service & Store ✅
- WP 5.5: Violation Display (Canvas) ✅
- WP 5.6: Validation Panel UI ✅

**Phase 5A (Basic Validation) is complete.** The system now has:
- Complete tri-color connection system (blue, green, red/amber)
- 6 validation rules checking graph quality
- Visual indicators on canvas (edges + node badges)
- Control panel for managing violations
- Auto-fix for applicable rules (self-loop, duplicate connection)

## [5.5.0] - 2026-01-18

### Added
- **Violation Display on Canvas**: Visual indicators for validation violations
  - `ViolationBadge.tsx` - Badge component showing violation counts on nodes
  - `ViolationTooltip.tsx` - Popover showing violation details with fix actions
  - `useNodeViolations.ts` - Hook to get violations for a specific entity node
  - `useEdgeViolations.ts` - Hook to get violations for a specific connection edge
- **Validation Colors**: Extended theme colors for validation glow effects
  - `ATHENA_COLORS.validation.error` - Red (#ef4444)
  - `ATHENA_COLORS.validation.errorGlow` - Red glow (40% opacity)
  - `ATHENA_COLORS.validation.warning` - Amber (#f59e0b)
  - `ATHENA_COLORS.validation.warningGlow` - Amber glow (40% opacity)

### Changed
- **EntityNode.tsx**: Added violation badge and glow effect
  - Shows red/amber badge in top-right corner when violations exist
  - Errors take priority over warnings for badge display
  - Click badge to see violation details tooltip
  - Node has subtle glow matching worst violation severity
- **ConnectionEdge.tsx**: Added violation styling for edges
  - Red solid stroke for error violations
  - Amber dashed stroke for warning violations
  - Violations override normal connection color

### Technical
- Badge uses `nodrag nopan` CSS classes to allow React Flow click handling
- Tooltip shows violation message, suggestion, and auto-fix button when available
- Violations filter uses `useViolationsFor` hook from validation module
- Edge violations check by connectionId for proper matching

### Visual Specification
| Element | Error | Warning |
|---------|-------|---------|
| Edge color | #ef4444 (red) | #f59e0b (amber) |
| Edge stroke | Solid, 2.5px | Dashed (5,5), 2.5px |
| Node badge | AlertCircle icon, count | AlertTriangle icon, count |
| Node glow | Red glow (40% opacity) | Amber glow (40% opacity) |

### Phase 5 Progress (at this version)
- WP 5.1: Validation Types ✅
- WP 5.2: Rules Engine ✅
- WP 5.3: MVP Validation Rules ✅
- WP 5.4: Validation Service & Store ✅
- WP 5.5: Violation Display (Canvas) ✅

## [4.6.0] - 2026-01-16

### Added
- **Faceted Search Panel**: Power search interface with filters (Cmd+Shift+K)
  - `SearchPanel.tsx` - Main search panel with facet sidebar and results list
  - `FacetSidebar.tsx` - Filter sidebar with checkboxes for each facet value
  - `SearchResults.tsx` - Results list with match type badges and "Show on Canvas" action
  - `useSearchPanel.ts` - Hook for panel open/close state with keyboard shortcuts
- **FacetService**: Extract and apply facets to search results
  - `src/modules/search/services/FacetService.ts` - Core facet logic
  - Type facet: Filter by note, plan, document
  - Created facet: Filter by Today, This Week, This Month, Older
  - Multiple selections within a facet = OR (expands results)
  - Selections across facets = AND (narrows results)
- **Facet Types**: TypeScript definitions for faceted search
  - `src/modules/search/types/facets.ts` - Facet, FacetValue, FacetSelection types
  - DateRangeBucket type for date categorization
- **Search Result Metadata**: Extended SearchResult for faceting
  - Added `createdAt` and `updatedAt` optional fields to SearchResult
  - SQLiteSearchAdapter now includes timestamps in results
- **cn Utility**: Conditional class name helper
  - `src/shared/utils/cn.ts` - Minimal clsx-like implementation

### Changed
- **Header.tsx**: Search icon now opens Search Panel
  - Added `onSearchClick` prop to Header component
  - Enabled search button (previously disabled placeholder)
- **AppLayout.tsx**: Integrated Search Panel
  - Added useSearchPanel hook and SearchPanel component
  - Connected header search button to panel open action

### Keyboard Shortcuts
- `Cmd+K` / `Ctrl+K`: Quick jump (Command Palette)
- `Cmd+Shift+K` / `Ctrl+Shift+K`: Advanced search (Search Panel)
- `Escape`: Close either panel

### Phase 4 Complete - Usability Milestone
- WP 4.1: Command Palette ✅
- WP 4.2: FTS Schema ✅
- WP 4.2.1: Custom sql.js with FTS5 ✅
- WP 4.3: Keyword Search ✅
- WP 4.4: Semantic Search ✅
- WP 4.5: Hybrid Search ✅
- WP 4.6: Faceted Search Panel ✅

**ATHENA is now ready for daily knowledge work!**

## [4.5.0] - 2026-01-16

### Added
- **Hybrid Search (RRF)**: Combines keyword and semantic search using Reciprocal Rank Fusion
  - `ISearchAdapter.hybridSearch()` - New interface method for hybrid search
  - `HybridSearchOptions` - Options including RRF parameters (k, keywordWeight, semanticWeight)
  - Entities appearing in BOTH keyword and semantic results rank higher
- **HybridSearchService**: RRF algorithm implementation
  - `src/modules/search/services/HybridSearchService.ts` - Core RRF logic
  - `applyRRF()` - Exported function for merging and re-ranking results
  - Default k=60 smoothing constant, weights=1.0 for balanced results
- **useHybridSearch Hook**: React hook for hybrid search state
  - `src/modules/search/hooks/useHybridSearch.ts`
  - Same API as keyword/semantic hooks for consistency
- **Search Config in DevSettings**: Configurable RRF parameters
  - `search.defaultMode` - Choose 'keyword', 'semantic', or 'hybrid'
  - `search.rrf.k` - RRF smoothing constant (higher = flatter curve)
  - `search.rrf.keywordWeight` - Weight for keyword results
  - `search.rrf.semanticWeight` - Weight for semantic results
  - `search.debounceMs` - Search input debounce delay

### Changed
- **Command Palette**: Now uses hybrid search by default
  - `useCommandPalette.ts` - Calls `hybridSearch()` instead of `keywordSearch()`
  - `CommandPaletteResult` - Added `matchType` field for display
- **CommandPalette.tsx**: Match type badges for search results
  - Purple badge for 'hybrid' (matched in both keyword AND semantic)
  - Blue badge for 'keyword' (matched only in FTS5)
  - Green badge for 'semantic' (matched only in vector search)

### Technical
- **RRF Formula**: `score = Σ (weight / (k + rank))` where rank is 1-indexed
  - Rank-based scoring normalizes incompatible score ranges (BM25 negative, cosine 0-1)
  - k=60 provides good balance between top rank dominance and flatness
- **Graceful Degradation**: Falls back to keyword-only if semantic search unavailable
- **Parallel Execution**: Keyword and semantic searches run concurrently via `Promise.all()`
- **Snippet Strategy**: Prefers keyword snippets (have `<mark>` highlighting)

### Phase 4 Progress (as of 4.5)
- WP 4.1: Command Palette ✅
- WP 4.2: FTS Schema ✅
- WP 4.2.1: Custom sql.js with FTS5 ✅
- WP 4.3: Keyword Search ✅
- WP 4.4: Semantic Search ✅
- WP 4.5: Hybrid Search ✅

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
- WP 4.5: Hybrid Search ✅

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
