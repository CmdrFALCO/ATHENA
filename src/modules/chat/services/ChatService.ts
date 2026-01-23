/**
 * Chat Service - Main Orchestrator
 * WP 7.3 - Conversational Generation
 *
 * Orchestrates the complete chat flow:
 * 1. Build context from knowledge graph (via ContextBuilder)
 * 2. Format system prompt with context
 * 3. Call AI with streaming
 * 4. Update UI state throughout
 */

import { chatActions, chatState$ } from '../store';
import { ContextBuilder } from './ContextBuilder';
import { ContextFormatter } from './ContextFormatter';
import { formatSystemPrompt } from './promptTemplates';
import { devSettings$ } from '@/config/devSettings';
import type { ChatMessage as StoredChatMessage } from '../types';
import type { IAIService } from '@/modules/ai';
import type { AIChatMessage } from '@/modules/ai/types';

export class ChatService {
  constructor(
    private aiService: IAIService,
    private contextBuilder: ContextBuilder
  ) {}

  /**
   * Send a message and get AI response with streaming.
   *
   * Flow:
   * 1. Ensure active thread exists
   * 2. Add user message to state
   * 3. Build context from knowledge graph
   * 4. Format system prompt
   * 5. Get conversation history
   * 6. Call AI with streaming
   * 7. Add assistant message on completion
   */
  async sendMessage(userMessage: string): Promise<void> {
    // Ensure we have an active thread
    let threadId = chatState$.activeThreadId.peek();
    if (!threadId) {
      threadId = await chatActions.createThread();
    }

    const thread = chatState$.threads[threadId]?.peek();
    if (!thread) {
      throw new Error('Failed to get active thread');
    }

    // 1. Add user message to state
    await chatActions.addMessage({
      threadId,
      role: 'user',
      content: userMessage,
    });

    // 2. Set loading state
    chatActions.setLoading(true);
    chatActions.setStreaming('');

    try {
      // 3. Build context from knowledge graph
      const contextConfig = devSettings$.chat.context?.peek();
      const contextResult = await this.contextBuilder.build({
        selectedNodeIds: thread.contextNodeIds || [],
        query: userMessage,
        maxItems: contextConfig?.maxItems ?? 10,
        similarityThreshold: contextConfig?.similarityThreshold ?? 0.7,
        includeTraversal: contextConfig?.includeTraversal ?? true,
        traversalDepth: contextConfig?.traversalDepth ?? 1,
      });

      // Log context for debugging
      console.log('[ChatService] Context built:', ContextFormatter.formatSummary(contextResult));

      // 4. Format context and build system prompt
      const contextText = ContextFormatter.formatForPrompt(contextResult.items);
      const generationConfig = devSettings$.chat.generation?.peek();
      const enableProposals = generationConfig?.enableProposals ?? true;
      const systemPrompt = formatSystemPrompt(contextText, enableProposals);

      // 5. Get conversation history (last N messages)
      const historyLimit = generationConfig?.historyLimit ?? 10;
      const history = this.getRecentHistory(threadId, historyLimit);

      // 6. Build messages array for AI
      const messages: AIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      // 7. Call AI with streaming
      let fullResponse = '';

      const result = await this.aiService.generateStream({
        messages,
        temperature: generationConfig?.temperature ?? 0.7,
        maxTokens: generationConfig?.maxTokens ?? 2048,
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          chatActions.setStreaming(fullResponse);
        },
        onError: (error: Error) => {
          console.error('[ChatService] Stream error:', error);
        },
      });

      // 8. Add assistant message (proposals parsed in WP 7.4)
      await chatActions.addMessage({
        threadId,
        role: 'assistant',
        content: result.fullResponse,
        // proposals will be added by WP 7.4 extraction
      });

    } catch (error) {
      console.error('[ChatService] Error:', error);

      // Add error message as assistant response so user sees it in context
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred';

      await chatActions.addMessage({
        threadId,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}\n\nPlease check that your AI provider is configured correctly in settings.`,
      });
    } finally {
      chatActions.setLoading(false);
      chatActions.setStreaming(null);
    }
  }

  /**
   * Get recent messages from a thread for conversation history.
   * Excludes system messages and respects the history limit.
   */
  private getRecentHistory(threadId: string, limit: number): StoredChatMessage[] {
    const messages = chatState$.messages[threadId]?.peek() || [];
    return messages
      .filter(m => m.role !== 'system')
      .slice(-limit);
  }

  /**
   * Cancel an in-progress generation.
   * Note: Full cancellation requires AbortController integration (future enhancement).
   */
  cancel(): void {
    chatActions.setLoading(false);
    chatActions.setStreaming(null);
    // TODO: Implement actual cancellation with AbortController
  }
}

// ============================================
// Singleton Management
// ============================================

let chatServiceInstance: ChatService | null = null;

/**
 * Initialize the ChatService singleton.
 * Should be called once during app initialization after AIService is ready.
 */
export function initChatService(
  aiService: IAIService,
  contextBuilder: ContextBuilder
): ChatService {
  chatServiceInstance = new ChatService(aiService, contextBuilder);

  // Expose for debugging
  if (typeof window !== 'undefined') {
    (window as unknown as { __ATHENA_CHAT_SERVICE__: ChatService }).__ATHENA_CHAT_SERVICE__ =
      chatServiceInstance;
  }

  console.log('[ChatService] Initialized');
  return chatServiceInstance;
}

/**
 * Get the ChatService singleton.
 * Throws if not initialized.
 */
export function getChatService(): ChatService {
  if (!chatServiceInstance) {
    throw new Error('ChatService not initialized. Call initChatService first.');
  }
  return chatServiceInstance;
}

/**
 * Check if ChatService is initialized.
 */
export function isChatServiceReady(): boolean {
  return chatServiceInstance !== null;
}

/**
 * Reset the singleton (for testing).
 */
export function resetChatService(): void {
  chatServiceInstance = null;
}
