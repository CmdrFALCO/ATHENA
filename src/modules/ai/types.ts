export type AIProviderType = 'gemini' | 'ollama' | 'anthropic' | 'openai' | 'mistral';

export interface IAIBackend {
  readonly id: string;
  readonly name: string;
  readonly type: AIProviderType;

  // Core operations
  embed(text: string): Promise<EmbeddingResult>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;

  // Connection management
  isAvailable(): Promise<boolean>;
  configure(config: ProviderConfig): void;

  // Model info
  getEmbeddingDimensions(): number;
  getSupportedModels(): ModelInfo[];
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  tokenCount?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  tokenCount?: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  chatModel: string;
  embeddingModel: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  type: 'chat' | 'embedding';
  dimensions?: number;
  contextWindow?: number;
}

// AI Settings for DevSettings integration
export interface AISettings {
  enabled: boolean;
  provider: AIProviderType | 'none';

  providerConfig: {
    gemini: { chatModel: string; embeddingModel: string };
    ollama: { endpoint: string; chatModel: string; embeddingModel: string };
    anthropic: { chatModel: string; embeddingModel: string };
    openai: { chatModel: string; embeddingModel: string };
    mistral: { chatModel: string; embeddingModel: string };
  };

  embedding: {
    strategy: 'single-model' | 'multi-model';
    autoReindexOnModelChange: boolean;
  };

  suggestions: {
    trigger: 'on-save' | 'on-demand' | 'continuous';
    confidenceThreshold: number;
    maxPerNote: number;
    showOnCanvas: boolean;
  };

  security: {
    requirePasswordForKeys: boolean;
  };
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'none',

  providerConfig: {
    gemini: { chatModel: 'gemini-1.5-flash', embeddingModel: 'text-embedding-004' },
    ollama: { endpoint: 'http://localhost:11434', chatModel: 'llama3.2', embeddingModel: 'nomic-embed-text' },
    anthropic: { chatModel: 'claude-3-haiku-20240307', embeddingModel: 'voyage-2' },
    openai: { chatModel: 'gpt-4o-mini', embeddingModel: 'text-embedding-3-small' },
    mistral: { chatModel: 'mistral-small-latest', embeddingModel: 'mistral-embed' },
  },

  embedding: {
    strategy: 'single-model',
    autoReindexOnModelChange: true,
  },

  suggestions: {
    trigger: 'on-save',
    confidenceThreshold: 0.7,
    maxPerNote: 5,
    showOnCanvas: true,
  },

  security: {
    requirePasswordForKeys: false,
  },
};

// Provider display names
export const PROVIDER_NAMES: Record<AIProviderType | 'none', string> = {
  none: 'None',
  gemini: 'Google Gemini',
  ollama: 'Ollama (Local)',
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  mistral: 'Mistral AI',
};

// Provider model options
export const PROVIDER_MODELS: Record<AIProviderType, { chat: string[]; embedding: string[] }> = {
  gemini: {
    chat: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    embedding: ['text-embedding-004'],
  },
  ollama: {
    chat: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi'],
    embedding: ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'],
  },
  anthropic: {
    chat: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    embedding: ['voyage-2', 'voyage-large-2', 'voyage-code-2'],
  },
  openai: {
    chat: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    embedding: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
  },
  mistral: {
    chat: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
    embedding: ['mistral-embed'],
  },
};
