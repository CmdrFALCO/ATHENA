import { observable, computed } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

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

// Resource configuration (WP 6.3, extended WP 6.5)
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
}

// URL configuration (WP 6.6)
export interface UrlConfig {
  /** Default mode for URL resources: 'reference' (bookmark) or 'extracted' (AI summarization) */
  defaultMode: 'reference' | 'extracted';
  /** If true, always use 'extracted' mode regardless of user selection */
  autoExtract: boolean;
}

// Context configuration for GraphRAG (WP 7.2)
export interface ContextConfig {
  /** Maximum context items to include */
  maxItems: number;
  /** Minimum similarity score for semantic search (0-1) */
  similarityThreshold: number;
  /** Whether to expand context via graph traversal */
  includeTraversal: boolean;
  /** How many hops to traverse in the graph */
  traversalDepth: number;
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

const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
  enabled: true,
  nodeColorScheme: 'per-type', // Default to per-type for visual distinction
  extraction: {
    strategy: 'browser-then-ai', // Best of both worlds
    aiEnabled: true,
    maxFileSizeMB: 10, // Don't send files larger than 10MB to AI
  },
};

const DEFAULT_URL_CONFIG: UrlConfig = {
  defaultMode: 'reference', // Default to bookmark-only for speed
  autoExtract: false, // Don't force AI extraction
};

const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxItems: 10,
  similarityThreshold: 0.7,
  includeTraversal: true,
  traversalDepth: 1,
};

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  enableProposals: true,
  historyLimit: 10,
  temperature: 0.7,
  maxTokens: 2048,
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

  // Metadata
  lastModified: null as string | null,
  version: 1,
});

// Persist to localStorage
persistObservable(devSettings$, {
  local: 'athena-dev-settings',
});

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

  // URL config actions (WP 6.6)
  setUrlDefaultMode(mode: UrlConfig['defaultMode']) {
    devSettings$.url.defaultMode.set(mode);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  setUrlAutoExtract(enabled: boolean) {
    devSettings$.url.autoExtract.set(enabled);
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
};

// Export for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_DEV_SETTINGS__: typeof devSettings$ }).__ATHENA_DEV_SETTINGS__ =
    devSettings$;
}
