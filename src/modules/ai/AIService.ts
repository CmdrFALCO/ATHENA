import type {
  IAIBackend,
  AIProviderType,
  EmbeddingResult,
  GenerateResult,
  GenerateOptions,
  AISettings,
  ProviderConfig,
} from './types';
import { DEFAULT_AI_SETTINGS } from './types';
import { GeminiBackend } from './backends';
import { getSecureStorage } from '@/services/secureStorage';
import type { IEmbeddingAdapter, EmbeddingRecord, SimilarityResult } from '@/adapters/IEmbeddingAdapter';

export interface IAIService {
  getBackend(): IAIBackend | null;
  embed(text: string): Promise<EmbeddingResult>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;

  isConfigured(): boolean;
  isAvailable(): Promise<boolean>;
  getCurrentProvider(): AIProviderType | null;

  // API key management (delegates to SecureStorage)
  setApiKey(provider: AIProviderType, key: string): Promise<void>;
  hasApiKey(provider: AIProviderType): Promise<boolean>;
  clearApiKey(provider: AIProviderType): Promise<void>;

  // Initialize with settings
  initialize(settings: AISettings): Promise<void>;

  // Embedding adapter integration
  setEmbeddingAdapter(adapter: IEmbeddingAdapter): void;
  embedAndStore(entityId: string, text: string): Promise<EmbeddingRecord | null>;
  findSimilarNotes(
    entityId: string,
    limit?: number,
    threshold?: number
  ): Promise<SimilarityResult[]>;
  getActiveEmbeddingModel(): string | null;
  handleModelChange(oldModel: string, newModel: string): Promise<void>;
}

class AIServiceImpl implements IAIService {
  private backend: IAIBackend | null = null;
  private settings: AISettings = DEFAULT_AI_SETTINGS;
  private apiKeys: Map<AIProviderType, string> = new Map();
  private embeddingAdapter: IEmbeddingAdapter | null = null;

  async initialize(settings: AISettings): Promise<void> {
    this.settings = settings;

    if (!settings.enabled || settings.provider === 'none') {
      this.backend = null;
      return;
    }

    // Load API key from secure storage
    const provider = settings.provider;
    const storage = getSecureStorage();

    try {
      // Ensure storage is unlocked
      if (storage.isLocked()) {
        await storage.unlock();
      }

      const storedKey = await storage.retrieve(`api-key-${provider}`);
      if (storedKey) {
        this.apiKeys.set(provider, storedKey);
      }
    } catch (error) {
      console.warn('Failed to load API key from secure storage:', error);
    }

    // Create backend based on provider
    this.backend = this.createBackend(provider);

    // Configure backend with settings and API key
    if (this.backend) {
      const providerConfig = settings.providerConfig[provider];
      const config: ProviderConfig = {
        ...providerConfig,
        apiKey: this.apiKeys.get(provider),
      };
      this.backend.configure(config);
    }
  }

  private createBackend(provider: AIProviderType): IAIBackend | null {
    switch (provider) {
      case 'gemini':
        return new GeminiBackend();
      case 'ollama':
        // TODO: Implement OllamaBackend
        console.warn('Ollama backend not yet implemented');
        return null;
      case 'anthropic':
        // TODO: Implement AnthropicBackend
        console.warn('Anthropic backend not yet implemented');
        return null;
      case 'openai':
        // TODO: Implement OpenAIBackend
        console.warn('OpenAI backend not yet implemented');
        return null;
      case 'mistral':
        // TODO: Implement MistralBackend
        console.warn('Mistral backend not yet implemented');
        return null;
      default:
        return null;
    }
  }

  getBackend(): IAIBackend | null {
    return this.backend;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.backend) {
      throw new Error('AI backend not configured');
    }
    return this.backend.embed(text);
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.backend) {
      throw new Error('AI backend not configured');
    }
    return this.backend.generate(prompt, options);
  }

  isConfigured(): boolean {
    if (!this.settings.enabled || this.settings.provider === 'none') {
      return false;
    }

    const provider = this.settings.provider;

    // Ollama doesn't need an API key
    if (provider === 'ollama') {
      return true;
    }

    // Other providers need an API key
    return this.apiKeys.has(provider);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured() || !this.backend) {
      return false;
    }
    return this.backend.isAvailable();
  }

  getCurrentProvider(): AIProviderType | null {
    if (!this.settings.enabled || this.settings.provider === 'none') {
      return null;
    }
    return this.settings.provider;
  }

  async setApiKey(provider: AIProviderType, key: string): Promise<void> {
    const storage = getSecureStorage();

    try {
      if (storage.isLocked()) {
        await storage.unlock();
      }
      await storage.store(`api-key-${provider}`, key);
      this.apiKeys.set(provider, key);

      // Reconfigure backend if it's the current provider
      if (this.backend && this.settings.provider === provider) {
        const providerConfig = this.settings.providerConfig[provider];
        this.backend.configure({
          ...providerConfig,
          apiKey: key,
        });
      }
    } catch (error) {
      console.error('Failed to store API key:', error);
      throw new Error('Failed to store API key securely');
    }
  }

  async hasApiKey(provider: AIProviderType): Promise<boolean> {
    // Check in-memory cache first
    if (this.apiKeys.has(provider)) {
      return true;
    }

    // Check secure storage
    const storage = getSecureStorage();
    try {
      if (storage.isLocked()) {
        await storage.unlock();
      }
      const key = await storage.retrieve(`api-key-${provider}`);
      if (key) {
        this.apiKeys.set(provider, key);
        return true;
      }
    } catch (error) {
      console.warn('Failed to check API key in secure storage:', error);
    }

    return false;
  }

  async clearApiKey(provider: AIProviderType): Promise<void> {
    const storage = getSecureStorage();

    try {
      if (storage.isLocked()) {
        await storage.unlock();
      }
      await storage.delete(`api-key-${provider}`);
      this.apiKeys.delete(provider);

      // Clear from backend if it's the current provider
      if (this.backend && this.settings.provider === provider) {
        const providerConfig = this.settings.providerConfig[provider];
        this.backend.configure({
          ...providerConfig,
          apiKey: undefined,
        });
      }
    } catch (error) {
      console.error('Failed to clear API key:', error);
      throw new Error('Failed to clear API key');
    }
  }

  // Reload API key from storage (useful when settings change)
  async reloadApiKey(provider: AIProviderType): Promise<void> {
    const storage = getSecureStorage();

    try {
      if (storage.isLocked()) {
        await storage.unlock();
      }
      const key = await storage.retrieve(`api-key-${provider}`);
      if (key) {
        this.apiKeys.set(provider, key);
      } else {
        this.apiKeys.delete(provider);
      }
    } catch (error) {
      console.warn('Failed to reload API key:', error);
    }
  }

  // ============================================
  // Embedding Adapter Integration
  // ============================================

  setEmbeddingAdapter(adapter: IEmbeddingAdapter): void {
    this.embeddingAdapter = adapter;
  }

  getActiveEmbeddingModel(): string | null {
    if (!this.settings.enabled || this.settings.provider === 'none') {
      return null;
    }

    const provider = this.settings.provider;
    const config = this.settings.providerConfig[provider];
    return config?.embeddingModel ?? null;
  }

  async embedAndStore(entityId: string, text: string): Promise<EmbeddingRecord | null> {
    if (!this.isConfigured()) {
      console.warn('AI not configured, cannot embed and store');
      return null;
    }

    if (!this.embeddingAdapter) {
      console.warn('Embedding adapter not set, cannot store embedding');
      return null;
    }

    const model = this.getActiveEmbeddingModel();
    if (!model) {
      console.warn('No active embedding model');
      return null;
    }

    try {
      const result = await this.embed(text);
      if (!result.vector || result.vector.length === 0) {
        console.warn('Embedding result has no vector');
        return null;
      }

      return await this.embeddingAdapter.store(entityId, result.vector, model);
    } catch (error) {
      console.error('Failed to embed and store:', error);
      return null;
    }
  }

  async findSimilarNotes(
    entityId: string,
    limit = 5,
    threshold = 0.7
  ): Promise<SimilarityResult[]> {
    if (!this.embeddingAdapter) {
      console.warn('[AIService.findSimilarNotes] Embedding adapter not set');
      return [];
    }

    const model = this.getActiveEmbeddingModel();
    if (!model) {
      console.warn('[AIService.findSimilarNotes] No active embedding model');
      return [];
    }

    try {
      const embedding = await this.embeddingAdapter.getForEntity(entityId, model);
      if (!embedding) {
        return [];
      }

      const results = await this.embeddingAdapter.findSimilar(
        embedding.vector,
        model,
        limit,
        threshold,
        [entityId] // Exclude the source entity
      );
      return results;
    } catch (error) {
      console.error('[AIService.findSimilarNotes] Failed:', error);
      return [];
    }
  }

  async handleModelChange(oldModel: string, newModel: string): Promise<void> {
    if (!this.embeddingAdapter) {
      console.warn('Embedding adapter not set, cannot handle model change');
      return;
    }

    const { strategy, autoReindexOnModelChange } = this.settings.embedding;

    if (strategy === 'single-model' && autoReindexOnModelChange) {
      // Delete all embeddings for the old model
      console.info(`Switching embedding model: ${oldModel} → ${newModel}`);
      await this.embeddingAdapter.deleteByModel(oldModel);
      // Note: Re-indexing with newModel happens via Background Indexer (WP 3.3)
    }
  }
}

// Singleton instance
let instance: AIServiceImpl | null = null;

export function getAIService(): IAIService {
  if (!instance) {
    instance = new AIServiceImpl();
  }
  return instance;
}

// For testing - reset the singleton
export function resetAIService(): void {
  instance = null;
}
