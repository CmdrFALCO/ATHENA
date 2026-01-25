/**
 * ChatServiceInitializer - Initializes ChatService when dependencies are ready
 * WP 7.3 - Conversational Generation
 * WP 7.4 - Knowledge Extraction Parser
 *
 * This component handles the initialization of ChatService, which requires:
 * 1. Adapters from AdapterProvider (for ContextBuilder and proposal resolution)
 * 2. AIService from AIProvider (for streaming generation and self-correction)
 *
 * It renders nothing but initializes ChatService in an effect.
 */

import { useEffect } from 'react';
import { useAdapters } from '@/adapters';
import { useAI } from '@/modules/ai';
import { ContextBuilder } from '../services/ContextBuilder';
import { initChatService, isChatServiceReady } from '../services/ChatService';

export function ChatServiceInitializer(): null {
  const adapters = useAdapters();
  const { service: aiService } = useAI();

  useEffect(() => {
    // Only initialize once
    if (isChatServiceReady()) {
      return;
    }

    // Create ContextBuilder with adapters
    const contextBuilder = new ContextBuilder(
      adapters.notes,
      adapters.resources,
      adapters.connections,
      adapters.embeddings,
      aiService
    );

    // Initialize ChatService with adapters for proposal resolution (WP 7.4)
    initChatService(aiService, contextBuilder, adapters.notes, adapters.resources);

    // Also expose ContextBuilder for debugging
    if (typeof window !== 'undefined') {
      (window as unknown as { __ATHENA_CONTEXT_BUILDER__: ContextBuilder }).__ATHENA_CONTEXT_BUILDER__ =
        contextBuilder;
    }
  }, [adapters, aiService]);

  // This component renders nothing
  return null;
}
