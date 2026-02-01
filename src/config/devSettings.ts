import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import type { SchemaConfig } from '@/modules/schema/types';
import type { JobsConfig } from '@/modules/jobs/types';
import type { SynthesisConfig } from '@/modules/synthesis/types';
import type { ViewsConfig } from '@/modules/views/types';

// Feature flag definitions
export interface FeatureFlags {
  // Phase 3: AI
  enableAI: boolean;
  aiBackend: 'ollama' | 'anthropic' | 'openai' | 'gemini' | 'mistral' | 'none';
  showGreenConnections: boolean;

  // Phase 4: Search
  enableSemanticSearch: boolean;
  enableHybridSearch: boolean;

  // Phase 5: Validation
  enableCPNValidation: boolean;
  showValidationPanel: boolean;

  // Phase 7: Chat
  enableChat: boolean;

  // Debug
  showDebugInfo: boolean;
  logStateChanges: boolean;
  logAdapterCalls: boolean;
}

// Canvas configuration
export interface CanvasConfig {
  /**
   * When to show AI-suggested (green) connections
   * 'always' = visible permanently on canvas (accumulate as you select notes)
   * 'on-select' = only when source/target note is selected (cleared on deselect)
   */
  showAiSuggestions: 'always' | 'on-select';
}

// Extraction strategy type
export type ExtractionStrategy = 'browser' | 'ai' | 'browser-then-ai';

// PDF structure extraction configuration (WP 8.2)
export interface PdfConfig {
  /** Enable document structure extraction for PDFs */
  extractStructure: boolean;
  /** Model to use for structure extraction (empty = default) */
  structureModel: string;
  /** Maximum tree depth (default: 4) */
  maxStructureDepth: number;
  /** Minimum pages to trigger structure extraction */
  minPagesForStructure: number;
}

// Resource configuration (WP 6.3, extended WP 6.5, WP 8.2)
export interface ResourceConfig {
  /** Whether resource nodes are enabled on canvas */
  enabled: boolean;
  /** Color scheme for resource nodes: 'unified' = all purple, 'per-type' = distinct colors per type */
  nodeColorScheme: 'unified' | 'per-type';
  /** Extraction settings (WP 6.5) */
  extraction: {
    /** Extraction strategy: browser-only, AI-only, or browser with AI fallback */
    strategy: ExtractionStrategy;
    /** Master toggle for AI extraction */
    aiEnabled: boolean;
    /** Maximum file size (MB) to send to AI extraction */
    maxFileSizeMB: number;
  };
  /** PDF structure extraction settings (WP 8.2) */
  pdf: PdfConfig;
}

// Firecrawl configuration (WP 8.3)
export interface FirecrawlConfig {
  /** Enable Firecrawl for URL extraction */
  enabled: boolean;
  /** Timeout for Firecrawl requests (ms) */
  timeout: number;
  /** Wait for JS rendering (ms) — 0 to disable */
  waitFor: number;
  /** Automatically use Firecrawl for known JS-heavy domains */
  autoDetectDynamic: boolean;
}

// URL configuration (WP 6.6, extended WP 8.3)
export interface UrlConfig {
  /** Default mode for URL resources: 'reference' (bookmark) or 'extracted' (AI summarization) */
  defaultMode: 'reference' | 'extracted';
  /** If true, always use 'extracted' mode regardless of user selection */
  autoExtract: boolean;
  /** Firecrawl web scraping settings (WP 8.3) */
  firecrawl: FirecrawlConfig;
}

// Context configuration for GraphRAG (WP 7.2, extended WP 8.8)
export interface ContextConfig {
  /** Maximum context items to include */
  maxItems: number;
  /** Minimum similarity score for semantic search (0-1) */
  similarityThreshold: number;
  /** Whether to expand context via graph traversal */
  includeTraversal: boolean;
  /** How many hops to traverse in the graph */
  traversalDepth: number;
  /** Score multiplier per hop (0.0-1.0) — controls relevance decay with distance (WP 8.8) */
  traversalDecay: number;
  /** Total traversal node budget — prevents explosion in dense graphs (WP 8.8) */
  maxTraversalNodes: number;
  /** Max chars of resource content to include in context (WP 8.7.2) */
  resourceMaxChars: number;
  /** Prefer document tree summaries over raw text for resources (WP 8.7.2) */
  useDocumentTree: boolean;
}

// Generation configuration for AI chat (WP 7.3)
export interface GenerationConfig {
  /** Whether to enable knowledge capture proposals */
  enableProposals: boolean;
  /** Number of recent messages to include in conversation history */
  historyLimit: number;
  /** Temperature for AI generation (0-1, higher = more creative) */
  temperature: number;
  /** Maximum tokens to generate per response */
  maxTokens: number;
  /** Optional model override (uses provider default if not set) */
  model?: string;
}

// Extraction configuration for proposal parsing (WP 7.4)
export interface ExtractionConfig {
  /** Whether to enable self-correction when parsing fails */
  enableSelfCorrection: boolean;
  /** Maximum number of correction attempts (1-5) */
  maxCorrectionAttempts: number;
  /** Minimum confidence threshold for proposals (0-1). Proposals below this are filtered out. */
  minConfidenceThreshold: number;
}

// Mentions configuration (WP 7.6)
export interface MentionsConfig {
  /** Enable @mention autocomplete */
  enabled: boolean;
  /** Maximum suggestions to show */
  maxSuggestions: number;
  /** Show recent notes when @ is typed without query */
  showRecentOnEmpty: boolean;
  /** Enable fuzzy matching */
  fuzzyMatch: boolean;
}

// Spatial context configuration (WP 7.6)
export interface SpatialContextConfig {
  /** Show context chips bar */
  showContextChips: boolean;
  /** Show "Add selected" button when canvas has selection */
  showAddSelectedButton: boolean;
  /** Maximum context items (notes) per thread */
  maxContextItems: number;
}

// Chat configuration (WP 7.1, extended WP 7.2, WP 7.3, WP 7.4, WP 7.6)
export interface ChatConfig {
  /** Whether chat panel is enabled */
  enabled: boolean;
  /** Panel position: 'right' or 'left' */
  position: 'right' | 'left';
  /** Default panel width in pixels */
  defaultWidth: number;
  /** Whether to persist chat history */
  persistHistory: boolean;
  /** Maximum days to keep chat history (0 = unlimited) */
  maxHistoryDays: number;
  /** Show floating toggle button */
  showToggleButton: boolean;
  /** Context building configuration (WP 7.2) */
  context: ContextConfig;
  /** Generation configuration (WP 7.3) */
  generation: GenerationConfig;
  /** Extraction configuration (WP 7.4) */
  extraction: ExtractionConfig;
  /** Mentions configuration (WP 7.6) */
  mentions: MentionsConfig;
  /** Spatial context configuration (WP 7.6) */
  spatialContext: SpatialContextConfig;
}

// Similarity / Entity Resolution configuration (WP 8.1)
export interface SimilarityConfig {
  /** Enable similarity detection */
  enabled: boolean;
  /** Minimum combined score to flag as merge candidate (0-1) */
  threshold: number;
  /** Check new notes for duplicates immediately on creation */
  runOnCreate: boolean;
  /** Weights for the three similarity signals */
  weights: {
    /** Title similarity weight (Jaro-Winkler) */
    title: number;
    /** Content similarity weight (Levenshtein) */
    content: number;
    /** Embedding similarity weight (cosine) */
    embedding: number;
  };
  /** Default merge behaviour */
  merge: {
    /** Default content strategy when merging */
    defaultContentStrategy: 'keep_primary' | 'keep_secondary' | 'concatenate';
    /** Transfer connections from secondary note */
    transferConnections: boolean;
    /** Transfer cluster memberships from secondary note */
    transferClusters: boolean;
  };
}

// Preference Learning configuration (WP 8.4)
export interface PreferenceLearningConfig {
  /** Enable preference tracking and learning */
  enabled: boolean;
  /** Number of recent signals to consider for adjustments */
  windowSize: number;
  /** How much historical data influences adjustments (0-1) */
  learningRate: number;
  /** Minimum signals before applying adjustments */
  minSignalsForAdjustment: number;
  /** Show learning insights in UI */
  showInsights: boolean;
}

// Search configuration (RRF parameters)
export interface SearchConfig {
  /** Default search mode for Command Palette */
  defaultMode: 'keyword' | 'semantic' | 'hybrid';
  /** RRF (Reciprocal Rank Fusion) parameters */
  rrf: {
    /** Smoothing constant (default: 60). Higher = flatter score distribution */
    k: number;
    /** Weight for keyword (FTS5/BM25) results (default: 1.0) */
    keywordWeight: number;
    /** Weight for semantic (vector) results (default: 1.0) */
    semanticWeight: number;
  };
  /** Debounce delay for search input (ms) */
  debounceMs: number;
}

const DEFAULT_SCHEMA_CONFIG: SchemaConfig = {
  enabled: true,
  activeSchemaId: null,
  showHintsInChat: true,
  includeInPrompts: true,
};

const DEFAULT_PREFERENCES_CONFIG: PreferenceLearningConfig = {
  enabled: true,
  windowSize: 100,
  learningRate: 0.3,
  minSignalsForAdjustment: 10,
  showInsights: true,
};

const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  enabled: true,
  threshold: 0.85,
  runOnCreate: true,
  weights: {
    title: 0.3,
    content: 0.2,
    embedding: 0.5,
  },
  merge: {
    defaultContentStrategy: 'keep_primary',
    transferConnections: true,
    transferClusters: true,
  },
};

const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  showAiSuggestions: 'always',
};

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  defaultMode: 'hybrid',
  rrf: {
    k: 60,
    keywordWeight: 1.0,
    semanticWeight: 1.0,
  },
  debounceMs: 300,
};

const DEFAULT_PDF_CONFIG: PdfConfig = {
  extractStructure: true,
  structureModel: '',
  maxStructureDepth: 4,
  minPagesForStructure: 5,
};

const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
  enabled: true,
  nodeColorScheme: 'per-type', // Default to per-type for visual distinction
  extraction: {
    strategy: 'browser-then-ai', // Best of both worlds
    aiEnabled: true,
    maxFileSizeMB: 10, // Don't send files larger than 10MB to AI
  },
  pdf: { ...DEFAULT_PDF_CONFIG },
};

const DEFAULT_FIRECRAWL_CONFIG: FirecrawlConfig = {
  enabled: false, // Disabled until API key is configured
  timeout: 30000,
  waitFor: 0,
  autoDetectDynamic: true,
};

const DEFAULT_URL_CONFIG: UrlConfig = {
  defaultMode: 'reference', // Default to bookmark-only for speed
  autoExtract: false, // Don't force AI extraction
  firecrawl: { ...DEFAULT_FIRECRAWL_CONFIG },
};

const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxItems: 10,
  similarityThreshold: 0.7,
  includeTraversal: true,
  traversalDepth: 2,
  traversalDecay: 0.5,
  maxTraversalNodes: 20,
  resourceMaxChars: 8000,
  useDocumentTree: true,
};

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  enableProposals: true,
  historyLimit: 10,
  temperature: 0.7,
  maxTokens: 4096,
};

const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  enableSelfCorrection: true,
  maxCorrectionAttempts: 3,
  minConfidenceThreshold: 0.5,
};

const DEFAULT_MENTIONS_CONFIG: MentionsConfig = {
  enabled: true,
  maxSuggestions: 8,
  showRecentOnEmpty: true,
  fuzzyMatch: true,
};

const DEFAULT_SPATIAL_CONTEXT_CONFIG: SpatialContextConfig = {
  showContextChips: true,
  showAddSelectedButton: true,
  maxContextItems: 10,
};

const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enabled: true,
  position: 'right',
  defaultWidth: 384, // 24rem (w-96)
  persistHistory: true,
  maxHistoryDays: 30,
  showToggleButton: true,
  context: { ...DEFAULT_CONTEXT_CONFIG },
  generation: { ...DEFAULT_GENERATION_CONFIG },
  extraction: { ...DEFAULT_EXTRACTION_CONFIG },
  mentions: { ...DEFAULT_MENTIONS_CONFIG },
  spatialContext: { ...DEFAULT_SPATIAL_CONTEXT_CONFIG },
};

// Synthesis Reports configuration (WP 8.7, WP 8.7.1)
const DEFAULT_SYNTHESIS_CONFIG: SynthesisConfig = {
  enabled: true,
  defaultFormat: 'summary',
  defaultMaxLength: 500,
  includeConnectionsByDefault: true,
  includeResourcesByDefault: true,
  resourceMaxChars: 5000,
  showInCanvasToolbar: true,
  streamingEnabled: true,
};

// Background Jobs configuration (WP 8.6)
const DEFAULT_JOBS_CONFIG: JobsConfig = {
  enabled: true,

  similarityScan: {
    enabled: true,
    intervalHours: 24,
    threshold: 0.85,
    batchSize: 100,
  },

  orphanDetection: {
    enabled: true,
    intervalHours: 168, // Weekly
    minAgeDays: 7,
  },

  staleConnection: {
    enabled: true,
    intervalHours: 24,
    autoDelete: true,
  },

  embeddingRefresh: {
    enabled: true,
    intervalHours: 24,
    batchSize: 50,
  },

  validationSweep: {
    enabled: true,
    intervalHours: 24,
  },
};

// Smart Views configuration (WP 8.9)
const DEFAULT_VIEWS_CONFIG: ViewsConfig = {
  enabled: true,
  showInSidebar: true,
  recentViewIds: [],
  maxResults: 50,
};

// Default values (conservative - features off until implemented)
const DEFAULT_FLAGS: FeatureFlags = {
  // AI (off until Phase 3)
  enableAI: false,
  aiBackend: 'none',
  showGreenConnections: true,  // Show green connections when AI is enabled

  // Search (off until Phase 4)
  enableSemanticSearch: false,
  enableHybridSearch: false,

  // Validation (off until Phase 5)
  enableCPNValidation: false,
  showValidationPanel: false,

  // Chat (on - WP 7.1)
  enableChat: true,

  // Debug (on for development)
  showDebugInfo: true,
  logStateChanges: false,
  logAdapterCalls: false,
};

// DevSettings store
export const devSettings$ = observable({
  flags: { ...DEFAULT_FLAGS } as FeatureFlags,
  canvas: { ...DEFAULT_CANVAS_CONFIG } as CanvasConfig,
  search: { ...DEFAULT_SEARCH_CONFIG } as SearchConfig,
  resources: { ...DEFAULT_RESOURCE_CONFIG } as ResourceConfig,
  url: { ...DEFAULT_URL_CONFIG } as UrlConfig,
  chat: { ...DEFAULT_CHAT_CONFIG } as ChatConfig,
  similarity: { ...DEFAULT_SIMILARITY_CONFIG } as SimilarityConfig,
  preferences: { ...DEFAULT_PREFERENCES_CONFIG } as PreferenceLearningConfig,
  schema: { ...DEFAULT_SCHEMA_CONFIG } as SchemaConfig,
  jobs: { ...DEFAULT_JOBS_CONFIG } as JobsConfig,
  synthesis: { ...DEFAULT_SYNTHESIS_CONFIG } as SynthesisConfig,
  views: { ...DEFAULT_VIEWS_CONFIG } as ViewsConfig,

  // Metadata
  lastModified: null as string | null,
  version: 2,
});

// Persist to localStorage
persistObservable(devSettings$, {
  local: 'athena-dev-settings',
});

// Migration: bump maxTokens if still at old default of 2048
// localStorage persistence loads synchronously, so values are already restored
{
  const currentMax = devSettings$.chat.generation.maxTokens.peek();
  if (currentMax <= 2048) {
    devSettings$.chat.generation.maxTokens.set(4096);
    console.log('[DevSettings] Migrated maxTokens:', currentMax, '→ 4096');
  }
}

// Computed helpers
export const isFeatureEnabled = (flag: keyof FeatureFlags) =>
  computed(() => devSettings$.flags[flag].get());

// Actions
export const devSettingsActions = {
  setFlag<K extends keyof FeatureFlags>(flag: K, value: FeatureFlags[K]) {
    const flags = devSettings$.flags.get();
    devSettings$.flags.set({ ...flags, [flag]: value });
    devSettings$.lastModified.set(new Date().toISOString());
  },

  resetToDefaults() {
    devSettings$.flags.set({ ...DEFAULT_FLAGS });
    devSettings$.canvas.set({ ...DEFAULT_CANVAS_CONFIG });
    devSettings$.search.set({ ...DEFAULT_SEARCH_CONFIG });
    devSettings$.resources.set({ ...DEFAULT_RESOURCE_CONFIG });
    devSettings$.url.set({ ...DEFAULT_URL_CONFIG });
    devSettings$.chat.set({ ...DEFAULT_CHAT_CONFIG });
    devSettings$.similarity.set({ ...DEFAULT_SIMILARITY_CONFIG });
    devSettings$.preferences.set({ ...DEFAULT_PREFERENCES_CONFIG });
    devSettings$.schema.set({ ...DEFAULT_SCHEMA_CONFIG });
    devSettings$.jobs.set({ ...DEFAULT_JOBS_CONFIG });
    devSettings$.synthesis.set({ ...DEFAULT_SYNTHESIS_CONFIG });
    devSettings$.views.set({ ...DEFAULT_VIEWS_CONFIG });
    devSettings$.lastModified.set(new Date().toISOString());
  },

  enableAllDebug() {
    devSettings$.flags.showDebugInfo.set(true);
    devSettings$.flags.logStateChanges.set(true);
    devSettings$.flags.logAdapterCalls.set(true);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  disableAllDebug() {
    devSettings$.flags.showDebugInfo.set(false);
    devSettings$.flags.logStateChanges.set(false);
    devSettings$.flags.logAdapterCalls.set(false);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Canvas config actions
  setShowAiSuggestions(mode: CanvasConfig['showAiSuggestions']) {
    devSettings$.canvas.showAiSuggestions.set(mode);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Search config actions
  setSearchMode(mode: SearchConfig['defaultMode']) {
    devSettings$.search.defaultMode.set(mode);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setRRFParams(params: Partial<SearchConfig['rrf']>) {
    const current = devSettings$.search.rrf.get();
    devSettings$.search.rrf.set({ ...current, ...params });
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSearchDebounce(ms: number) {
    devSettings$.search.debounceMs.set(ms);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Resource config actions (WP 6.3)
  setResourcesEnabled(enabled: boolean) {
    devSettings$.resources.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setResourceColorScheme(scheme: ResourceConfig['nodeColorScheme']) {
    devSettings$.resources.nodeColorScheme.set(scheme);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Extraction config actions (WP 6.5)
  setExtractionStrategy(strategy: ExtractionStrategy) {
    devSettings$.resources.extraction.strategy.set(strategy);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setAIExtractionEnabled(enabled: boolean) {
    devSettings$.resources.extraction.aiEnabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setMaxFileSizeMB(sizeMB: number) {
    devSettings$.resources.extraction.maxFileSizeMB.set(sizeMB);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // PDF structure config actions (WP 8.2)
  setPdfExtractStructure(enabled: boolean) {
    devSettings$.resources.pdf.extractStructure.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPdfStructureModel(model: string) {
    devSettings$.resources.pdf.structureModel.set(model);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPdfMaxStructureDepth(depth: number) {
    devSettings$.resources.pdf.maxStructureDepth.set(depth);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPdfMinPagesForStructure(pages: number) {
    devSettings$.resources.pdf.minPagesForStructure.set(pages);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // URL config actions (WP 6.6)
  setUrlDefaultMode(mode: UrlConfig['defaultMode']) {
    devSettings$.url.defaultMode.set(mode);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setUrlAutoExtract(enabled: boolean) {
    devSettings$.url.autoExtract.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Firecrawl config actions (WP 8.3)
  setFirecrawlEnabled(enabled: boolean) {
    devSettings$.url.firecrawl.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setFirecrawlTimeout(timeout: number) {
    devSettings$.url.firecrawl.timeout.set(timeout);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setFirecrawlWaitFor(waitFor: number) {
    devSettings$.url.firecrawl.waitFor.set(waitFor);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setFirecrawlAutoDetect(autoDetect: boolean) {
    devSettings$.url.firecrawl.autoDetectDynamic.set(autoDetect);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Chat config actions (WP 7.1)
  setChatEnabled(enabled: boolean) {
    devSettings$.chat.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setChatPosition(position: ChatConfig['position']) {
    devSettings$.chat.position.set(position);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setChatWidth(width: number) {
    devSettings$.chat.defaultWidth.set(width);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setChatPersistHistory(enabled: boolean) {
    devSettings$.chat.persistHistory.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setChatShowToggleButton(show: boolean) {
    devSettings$.chat.showToggleButton.set(show);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Context config actions (WP 7.2)
  setContextMaxItems(value: number) {
    devSettings$.chat.context.maxItems.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setContextSimilarityThreshold(value: number) {
    devSettings$.chat.context.similarityThreshold.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setContextIncludeTraversal(value: boolean) {
    devSettings$.chat.context.includeTraversal.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setContextTraversalDepth(value: number) {
    devSettings$.chat.context.traversalDepth.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Multi-hop traversal config actions (WP 8.8)
  setTraversalDecay(decay: number) {
    devSettings$.chat.context.traversalDecay.set(Math.max(0, Math.min(1, decay)));
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setMaxTraversalNodes(max: number) {
    devSettings$.chat.context.maxTraversalNodes.set(Math.max(1, max));
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Resource context config actions (WP 8.7.2)
  setContextResourceMaxChars(value: number) {
    devSettings$.chat.context.resourceMaxChars.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setContextUseDocumentTree(value: boolean) {
    devSettings$.chat.context.useDocumentTree.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Generation config actions (WP 7.3)
  setGenerationEnableProposals(value: boolean) {
    devSettings$.chat.generation.enableProposals.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setGenerationHistoryLimit(value: number) {
    devSettings$.chat.generation.historyLimit.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setGenerationTemperature(value: number) {
    devSettings$.chat.generation.temperature.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setGenerationMaxTokens(value: number) {
    devSettings$.chat.generation.maxTokens.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Extraction config actions (WP 7.4)
  setExtractionSelfCorrection(value: boolean) {
    devSettings$.chat.extraction.enableSelfCorrection.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setExtractionMaxAttempts(value: number) {
    devSettings$.chat.extraction.maxCorrectionAttempts.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setExtractionMinConfidence(value: number) {
    devSettings$.chat.extraction.minConfidenceThreshold.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Mentions config actions (WP 7.6)
  setMentionsEnabled(value: boolean) {
    devSettings$.chat.mentions.enabled.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setMentionsMaxSuggestions(value: number) {
    devSettings$.chat.mentions.maxSuggestions.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setMentionsShowRecentOnEmpty(value: boolean) {
    devSettings$.chat.mentions.showRecentOnEmpty.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setMentionsFuzzyMatch(value: boolean) {
    devSettings$.chat.mentions.fuzzyMatch.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Spatial context config actions (WP 7.6)
  setSpatialContextShowChips(value: boolean) {
    devSettings$.chat.spatialContext.showContextChips.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSpatialContextShowAddSelected(value: boolean) {
    devSettings$.chat.spatialContext.showAddSelectedButton.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSpatialContextMaxItems(value: number) {
    devSettings$.chat.spatialContext.maxContextItems.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Similarity config actions (WP 8.1)
  setSimilarityEnabled(value: boolean) {
    devSettings$.similarity.enabled.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSimilarityThreshold(value: number) {
    devSettings$.similarity.threshold.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSimilarityRunOnCreate(value: boolean) {
    devSettings$.similarity.runOnCreate.set(value);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSimilarityWeights(weights: Partial<SimilarityConfig['weights']>) {
    const current = devSettings$.similarity.weights.get();
    devSettings$.similarity.weights.set({ ...current, ...weights });
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSimilarityMergeDefaults(merge: Partial<SimilarityConfig['merge']>) {
    const current = devSettings$.similarity.merge.get();
    devSettings$.similarity.merge.set({ ...current, ...merge });
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Preference Learning config actions (WP 8.4)
  setPreferencesEnabled(enabled: boolean) {
    devSettings$.preferences.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPreferenceLearningRate(rate: number) {
    devSettings$.preferences.learningRate.set(Math.max(0, Math.min(1, rate)));
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPreferenceWindowSize(size: number) {
    devSettings$.preferences.windowSize.set(Math.max(10, size));
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPreferenceMinSignals(min: number) {
    devSettings$.preferences.minSignalsForAdjustment.set(Math.max(1, min));
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setPreferenceShowInsights(show: boolean) {
    devSettings$.preferences.showInsights.set(show);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Schema config actions (WP 8.5)
  setSchemaEnabled(enabled: boolean) {
    devSettings$.schema.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setActiveSchemaId(schemaId: string | null) {
    devSettings$.schema.activeSchemaId.set(schemaId);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSchemaShowHints(show: boolean) {
    devSettings$.schema.showHintsInChat.set(show);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSchemaIncludeInPrompts(include: boolean) {
    devSettings$.schema.includeInPrompts.set(include);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Background Jobs config actions (WP 8.6)
  setJobsEnabled(enabled: boolean) {
    devSettings$.jobs.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobSimilarityScanEnabled(enabled: boolean) {
    devSettings$.jobs.similarityScan.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobSimilarityScanInterval(hours: number) {
    devSettings$.jobs.similarityScan.intervalHours.set(hours);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobOrphanDetectionEnabled(enabled: boolean) {
    devSettings$.jobs.orphanDetection.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobStaleConnectionEnabled(enabled: boolean) {
    devSettings$.jobs.staleConnection.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobStaleConnectionAutoDelete(autoDelete: boolean) {
    devSettings$.jobs.staleConnection.autoDelete.set(autoDelete);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobEmbeddingRefreshEnabled(enabled: boolean) {
    devSettings$.jobs.embeddingRefresh.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setJobValidationSweepEnabled(enabled: boolean) {
    devSettings$.jobs.validationSweep.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Synthesis config actions (WP 8.7)
  setSynthesisEnabled(enabled: boolean) {
    devSettings$.synthesis.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSynthesisDefaultFormat(format: SynthesisConfig['defaultFormat']) {
    devSettings$.synthesis.defaultFormat.set(format);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSynthesisDefaultMaxLength(length: number) {
    devSettings$.synthesis.defaultMaxLength.set(length);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSynthesisShowInToolbar(show: boolean) {
    devSettings$.synthesis.showInCanvasToolbar.set(show);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // WP 8.7.1: Resource support config
  setSynthesisIncludeResourcesByDefault(include: boolean) {
    devSettings$.synthesis.includeResourcesByDefault.set(include);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setSynthesisResourceMaxChars(chars: number) {
    devSettings$.synthesis.resourceMaxChars.set(chars);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  // Smart Views config actions (WP 8.9)
  setViewsEnabled(enabled: boolean) {
    devSettings$.views.enabled.set(enabled);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setViewsShowInSidebar(show: boolean) {
    devSettings$.views.showInSidebar.set(show);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setViewsMaxResults(max: number) {
    devSettings$.views.maxResults.set(Math.max(1, Math.min(200, max)));
    devSettings$.lastModified.set(new Date().toISOString());
  },
};

// Export for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_DEV_SETTINGS__: typeof devSettings$ }).__ATHENA_DEV_SETTINGS__ =
    devSettings$;
}
