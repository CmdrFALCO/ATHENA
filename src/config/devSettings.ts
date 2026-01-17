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
};

// Export for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_DEV_SETTINGS__: typeof devSettings$ }).__ATHENA_DEV_SETTINGS__ =
    devSettings$;
}
