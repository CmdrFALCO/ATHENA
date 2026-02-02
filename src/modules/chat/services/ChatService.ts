/**
 * Chat Service - Main Orchestrator
 * WP 7.3 - Conversational Generation
 * WP 7.4 - Knowledge Extraction Parser
 *
 * Orchestrates the complete chat flow:
 * 1. Build context from knowledge graph (via ContextBuilder)
 * 2. Format system prompt with context
 * 3. Call AI with streaming
 * 4. Parse knowledge proposals from response
 * 5. Update UI state throughout
 */

import { chatActions, chatState$ } from '../store';
import { ContextBuilder } from './ContextBuilder';
import { ContextFormatter } from './ContextFormatter';
import { formatSystemPrompt, formatRegenerationPrompt } from './promptTemplates';
import { extractProposals, stripProposalBlock, resolveProposalReferences, applyLearnedAdjustments } from './ProposalParser';
import { getSelfCorrectingExtractor } from './SelfCorrectingExtractor';
import { devSettings$ } from '@/config/devSettings';
import { appState$ } from '@/store/state';
import { resourceState$ } from '@/store/resourceState';
import { schemaActions } from '@/modules/schema/store/schemaActions';
import type { ChatMessage as StoredChatMessage, KnowledgeProposals } from '../types';
import type { IAIService } from '@/modules/ai';
import type { AIChatMessage } from '@/modules/ai/types';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';

export class ChatService {
  private aiService: IAIService;
  private contextBuilder: ContextBuilder;
  private noteAdapter?: INoteAdapter;
  private resourceAdapter?: IResourceAdapter;

  constructor(
    aiService: IAIService,
    contextBuilder: ContextBuilder,
    noteAdapter?: INoteAdapter,
    resourceAdapter?: IResourceAdapter
  ) {
    this.aiService = aiService;
    this.contextBuilder = contextBuilder;
    this.noteAdapter = noteAdapter;
    this.resourceAdapter = resourceAdapter;
  }

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

      // WP 8.7.2: Read selected resource IDs from canvas state
      // Merge multi-selection (shift+click) with single-selection (normal click)
      const multiSelectedIds = appState$.ui.selectedResourceIds.peek();
      const singleSelectedId = resourceState$.selectedResourceId.peek();
      const selectedResourceIds = singleSelectedId && !multiSelectedIds.includes(singleSelectedId)
        ? [...multiSelectedIds, singleSelectedId]
        : multiSelectedIds;

      const contextResult = await this.contextBuilder.build({
        selectedNodeIds: thread.contextNodeIds || [],
        selectedResourceIds,
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
      let systemPrompt = formatSystemPrompt(contextText, enableProposals);

      // 4b. Add schema guidance if enabled (WP 8.5)
      const schemaAddition = await schemaActions.getSchemaPromptAddition();
      if (schemaAddition) {
        systemPrompt += '\n\n' + schemaAddition;
      }

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
        maxTokens: generationConfig?.maxTokens ?? 4096,
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          chatActions.setStreaming(fullResponse);
        },
        onError: (error: Error) => {
          console.error('[ChatService] Stream error:', error);
        },
      });

      // 8. Parse proposals from response (WP 7.4)
      const extractionConfig = devSettings$.chat.extraction?.peek();
      let proposals: KnowledgeProposals | null = null;

      // Try fast extraction first
      const fastResult = extractProposals(result.fullResponse);

      if (fastResult.success) {
        proposals = fastResult.proposals;
      } else if (extractionConfig?.enableSelfCorrection !== false) {
        // Fall back to self-correction
        console.log('[ChatService] Fast extraction failed, trying self-correction');
        const extractor = getSelfCorrectingExtractor(this.aiService);
        const correctionResult = await extractor.extract(result.fullResponse);

        if (correctionResult.success) {
          proposals = correctionResult.proposals;
          console.log(`[ChatService] Self-correction succeeded after ${correctionResult.iterations} attempts`);
        } else {
          console.warn('[ChatService] Self-correction failed:', correctionResult.finalError);
        }
      }

      // Resolve title references if we have proposals and adapters
      if (proposals && this.noteAdapter) {
        proposals = await resolveProposalReferences(
          proposals,
          this.noteAdapter,
          this.resourceAdapter
        );
        console.log(`[ChatService] Parsed ${proposals.nodes.length} nodes, ${proposals.edges.length} edges`);
      }

      // Apply learned confidence adjustments (WP 8.4)
      if (proposals) {
        proposals = await applyLearnedAdjustments(proposals);
      }

      // Record schema usage if extraction produced proposals (WP 8.5)
      const activeSchemaId = devSettings$.schema.activeSchemaId.peek();
      if (activeSchemaId && proposals && proposals.nodes.length > 0) {
        await schemaActions.recordUsage(activeSchemaId).catch(err =>
          console.warn('[ChatService] Failed to record schema usage:', err)
        );
      }

      // Filter low-confidence proposals
      if (proposals) {
        const minConfidence = extractionConfig?.minConfidenceThreshold ?? 0.5;

        proposals = {
          nodes: proposals.nodes.filter(n => n.confidence >= minConfidence),
          edges: proposals.edges.filter(e => e.confidence >= minConfidence),
        };

        // Set to null if nothing remains
        if (proposals.nodes.length === 0 && proposals.edges.length === 0) {
          proposals = null;
        }
      }

      // Strip proposal block from display content
      const displayContent = stripProposalBlock(result.fullResponse);

      // 9. Add assistant message with proposals
      await chatActions.addMessage({
        threadId,
        role: 'assistant',
        content: displayContent,
        proposals: proposals || undefined,
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

  /**
   * Regenerate proposals with structured feedback from AXIOM.
   * WP 9A.4 - AXIOM Integration
   *
   * Unlike sendMessage(), this method:
   * - Uses a regeneration-specific system prompt
   * - Includes structured validation feedback
   * - Does not update streaming UI state
   * - Returns a parsed PROPOSAL directly
   *
   * @param correlationId - Links to original proposal batch
   * @param feedbackPrompt - Formatted feedback for LLM
   * @param context - Regeneration context with history
   */
  async regenerate(
    correlationId: string,
    feedbackPrompt: string,
    context: {
      originalProposal: { nodes: unknown[]; edges: unknown[] };
      feedbackHistory: unknown[];
      attempt: number;
    },
  ): Promise<{
    id: string;
    correlationId: string;
    nodes: import('../types').NodeProposal[];
    edges: import('../types').EdgeProposal[];
    attempt: number;
    feedbackHistory: unknown[];
    generatedAt: string;
    generatedBy: string;
  }> {
    const generationConfig = devSettings$.chat.generation?.peek();
    const maxAttempts = devSettings$.axiom.workflow.maxRetries.peek();

    // Build regeneration system prompt
    const systemPrompt = formatRegenerationPrompt({
      originalProposal: context.originalProposal,
      feedback: feedbackPrompt,
      attempt: context.attempt,
      maxAttempts,
    });

    // Build messages for AI
    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Please regenerate the proposals addressing the validation feedback above. This is attempt ${context.attempt} of ${maxAttempts}.`,
      },
    ];

    // Call AI (non-streaming — no UI update needed)
    let fullResponse = '';
    const result = await this.aiService.generateStream({
      messages,
      temperature: Math.min((generationConfig?.temperature ?? 0.7) + 0.1, 1.0),
      maxTokens: generationConfig?.maxTokens ?? 4096,
      onChunk: (chunk: string) => {
        fullResponse += chunk;
      },
      onError: (error: Error) => {
        console.error('[ChatService] Regeneration stream error:', error);
      },
    });

    // Add feedback message to thread for transparency
    const threadId = chatState$.activeThreadId.peek();
    if (threadId) {
      await chatActions.addMessage({
        threadId,
        role: 'system',
        content: `[AXIOM Feedback - Attempt ${context.attempt}]\n\n${feedbackPrompt}`,
      });
    }

    // Parse proposals from response
    const extractionResult = extractProposals(result.fullResponse);
    const proposals: KnowledgeProposals = extractionResult.success && extractionResult.proposals
      ? extractionResult.proposals
      : { nodes: [], edges: [] };

    // Resolve title references if adapters available
    let resolvedProposals = proposals;
    if (this.noteAdapter && (proposals.nodes.length > 0 || proposals.edges.length > 0)) {
      resolvedProposals = await resolveProposalReferences(
        proposals,
        this.noteAdapter,
        this.resourceAdapter,
      );
    }

    console.log(
      `[ChatService] Regeneration attempt ${context.attempt}: ${resolvedProposals.nodes.length} nodes, ${resolvedProposals.edges.length} edges`,
    );

    // Build PROPOSAL-compatible return
    return {
      id: crypto.randomUUID(),
      correlationId,
      nodes: resolvedProposals.nodes,
      edges: resolvedProposals.edges,
      attempt: context.attempt,
      feedbackHistory: context.feedbackHistory,
      generatedAt: new Date().toISOString(),
      generatedBy: 'axiom-regeneration',
    };
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
  contextBuilder: ContextBuilder,
  noteAdapter?: INoteAdapter,
  resourceAdapter?: IResourceAdapter
): ChatService {
  chatServiceInstance = new ChatService(aiService, contextBuilder, noteAdapter, resourceAdapter);

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
