import type {
  IAIBackend,
  AIProviderType,
  EmbeddingResult,
  GenerateResult,
  GenerateOptions,
  GenerateWithAttachmentOptions,
  ProviderConfig,
  ModelInfo,
  StreamOptions,
  StreamResult,
  AIChatMessage,
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

// Content format for Gemini streaming API
interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiBackend implements IAIBackend {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type: AIProviderType = 'gemini';

  private apiKey: string | null = null;
  private chatModel = 'gemini-2.5-flash';
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
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', type: 'chat', contextWindow: 1000000 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', type: 'chat', contextWindow: 2000000 },
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

  /**
   * Generate content with an attached file (image/PDF) for multimodal extraction.
   * Uses Gemini's vision capabilities for OCR and document understanding.
   */
  async generateWithAttachment(options: GenerateWithAttachmentOptions): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    // Use the configured chat model - all Gemini chat models support multimodal
    // Model names: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp, etc.
    const url = `${BASE_URL}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;

    interface InlineDataPart {
      inlineData: {
        mimeType: string;
        data: string;
      };
    }

    interface TextPart {
      text: string;
    }

    type Part = InlineDataPart | TextPart;

    const parts: Part[] = [
      {
        inlineData: {
          mimeType: options.attachment.mimeType,
          data: options.attachment.data,
        },
      },
      { text: options.prompt },
    ];

    const body: {
      contents: Array<{ parts: Part[] }>;
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
      };
    } = {
      contents: [{ parts }],
    };

    if (options.maxTokens || options.temperature !== undefined) {
      body.generationConfig = {};
      if (options.maxTokens) body.generationConfig.maxOutputTokens = options.maxTokens;
      if (options.temperature !== undefined) body.generationConfig.temperature = options.temperature;
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
      tokenCount: response.usageMetadata
        ? {
            prompt: response.usageMetadata.promptTokenCount,
            completion: response.usageMetadata.candidatesTokenCount,
            total: response.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason,
    };
  }

  /**
   * Generate a streaming response using Server-Sent Events (SSE).
   * WP 7.3 - Conversational Generation
   *
   * Uses Gemini's streamGenerateContent endpoint with alt=sse parameter.
   */
  async generateStream(options: StreamOptions): Promise<StreamResult> {
    if (!this.apiKey) {
      const error = new Error('Gemini API key not configured');
      options.onError?.(error);
      throw error;
    }

    const {
      messages,
      onChunk,
      onComplete,
      onError,
      temperature = 0.7,
      maxTokens = 4096,
    } = options;

    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    // Use SSE streaming endpoint
    const url = `${BASE_URL}/models/${this.chatModel}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: this.formatMessagesForGemini(chatMessages),
          systemInstruction: systemMessage
            ? { parts: [{ text: systemMessage.content }] }
            : undefined,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GeminiErrorResponse;
        const errorMessage = errorData.error?.message || `API request failed: ${response.status}`;
        const error = new Error(errorMessage);
        onError?.(error);
        throw error;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const error = new Error('No response body');
        onError?.(error);
        throw error;
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const data = JSON.parse(jsonStr) as GeminiGenerateResponse;
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  fullResponse += text;
                  onChunk(text);
                }
              } catch {
                // Skip malformed JSON chunks
                console.warn('[GeminiBackend] Failed to parse streaming chunk:', jsonStr.slice(0, 100));
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const data = JSON.parse(jsonStr) as GeminiGenerateResponse;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullResponse += text;
              onChunk(text);
            }
          } catch {
            // Ignore malformed final chunk
          }
        }
      }

      onComplete?.(fullResponse);

      return {
        fullResponse,
        tokenCount: undefined, // Gemini doesn't provide token count in streaming
      };
    } catch (error) {
      // Re-throw without calling onError again — it was already called above
      if (error instanceof Error) throw error;
      const err = new Error(String(error));
      onError?.(err);
      throw err;
    }
  }

  /**
   * Format messages for Gemini API.
   * Gemini uses 'user' and 'model' roles instead of 'user' and 'assistant'.
   */
  private formatMessagesForGemini(messages: AIChatMessage[]): GeminiContent[] {
    return messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
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
