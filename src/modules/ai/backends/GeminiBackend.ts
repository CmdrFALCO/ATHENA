import type {
  IAIBackend,
  AIProviderType,
  EmbeddingResult,
  GenerateResult,
  GenerateOptions,
  ProviderConfig,
  ModelInfo,
} from '../types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

interface GeminiEmbedResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiGenerateResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiBackend implements IAIBackend {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type: AIProviderType = 'gemini';

  private apiKey: string | null = null;
  private chatModel = 'gemini-1.5-flash';
  private embeddingModel = 'text-embedding-004';

  configure(config: ProviderConfig): void {
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.chatModel) this.chatModel = config.chatModel;
    if (config.embeddingModel) this.embeddingModel = config.embeddingModel;
  }

  getEmbeddingDimensions(): number {
    // text-embedding-004 produces 768 dimensions
    return 768;
  }

  getSupportedModels(): ModelInfo[] {
    return [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', type: 'chat', contextWindow: 2000000 },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'text-embedding-004', name: 'Text Embedding 004', type: 'embedding', dimensions: 768 },
    ];
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      // Simple test: try to embed a short string
      await this.embed('test');
      return true;
    } catch {
      return false;
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = `${BASE_URL}/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
    const body = {
      content: {
        parts: [{ text }],
      },
    };

    const response = await this.fetchWithRetry<GeminiEmbedResponse>(url, body);

    return {
      vector: response.embedding.values,
      model: this.embeddingModel,
      dimensions: response.embedding.values.length,
    };
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = `${BASE_URL}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;

    interface ContentPart {
      text: string;
    }

    interface Content {
      role?: string;
      parts: ContentPart[];
    }

    const contents: Content[] = [];

    // Add system prompt if provided
    if (options?.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: options.systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    contents.push({
      parts: [{ text: prompt }],
    });

    const body: {
      contents: Content[];
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
        stopSequences?: string[];
      };
    } = { contents };

    if (options?.maxTokens || options?.temperature !== undefined || options?.stopSequences) {
      body.generationConfig = {};
      if (options.maxTokens) body.generationConfig.maxOutputTokens = options.maxTokens;
      if (options.temperature !== undefined) body.generationConfig.temperature = options.temperature;
      if (options.stopSequences) body.generationConfig.stopSequences = options.stopSequences;
    }

    const response = await this.fetchWithRetry<GeminiGenerateResponse>(url, body);

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const candidate = response.candidates[0]!;
    const text = candidate.content.parts.map(p => p.text).join('');

    let finishReason: 'stop' | 'length' | 'error' = 'stop';
    if (candidate.finishReason === 'MAX_TOKENS') {
      finishReason = 'length';
    } else if (candidate.finishReason === 'ERROR' || candidate.finishReason === 'SAFETY') {
      finishReason = 'error';
    }

    return {
      text,
      model: this.chatModel,
      tokenCount: response.usageMetadata ? {
        prompt: response.usageMetadata.promptTokenCount,
        completion: response.usageMetadata.candidatesTokenCount,
        total: response.usageMetadata.totalTokenCount,
      } : undefined,
      finishReason,
    };
  }

  private async fetchWithRetry<T>(url: string, body: object): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json() as GeminiErrorResponse;
          const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

          // Don't retry on auth errors
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication failed: ${errorMessage}`);
          }

          // Don't retry on bad request
          if (response.status === 400) {
            throw new Error(`Bad request: ${errorMessage}`);
          }

          // Retry on rate limit or server errors
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`${errorMessage} (attempt ${attempt + 1}/${MAX_RETRIES})`);
            if (attempt < MAX_RETRIES - 1) {
              await this.delay(RETRY_DELAYS[attempt] ?? 1000);
              continue;
            }
          }

          throw new Error(errorMessage);
        }

        return await response.json() as T;
      } catch (error) {
        if (error instanceof Error) {
          // Don't retry auth or bad request errors
          if (error.message.includes('Authentication') || error.message.includes('Bad request')) {
            throw error;
          }
          lastError = error;
        } else {
          lastError = new Error('Unknown error');
        }

        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAYS[attempt] ?? 1000);
        }
      }
    }

    throw lastError || new Error('Failed after max retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
