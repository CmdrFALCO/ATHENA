/**
 * ChatServiceInitializer - Initializes ChatService when dependencies are ready
 * WP 7.3 - Conversational Generation
 *
 * This component handles the initialization of ChatService, which requires:
 * 1. Adapters from AdapterProvider (for ContextBuilder)
 * 2. AIService from AIProvider (for streaming generation)
 *
 * It renders nothing but initializes ChatService in an effect.
 */

import { useEffect, useRef } from 'react';
import { useAdapters } from '@/adapters';
import { useAI } from '@/modules/ai';
import { ContextBuilder } from '../services/ContextBuilder';
import { initChatService, isChatServiceReady } from '../services/ChatService';

export function ChatServiceInitializer(): null {
  const adapters = useAdapters();
  const { service: aiService, isConfigured } = useAI();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initializedRef.current || isChatServiceReady()) {
      return;
    }

    // Need adapters to build context
    if (!adapters) {
      console.log('[ChatServiceInitializer] Waiting for adapters...');
      return;
    }

    // AIService needs to be available (even if not configured, we can still try)
    if (!aiService) {
      console.log('[ChatServiceInitializer] Waiting for AIService...');
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

    // Initialize ChatService
    initChatService(aiService, contextBuilder);
    initializedRef.current = true;

    // Also expose ContextBuilder for debugging
    if (typeof window !== 'undefined') {
      (window as unknown as { __ATHENA_CONTEXT_BUILDER__: ContextBuilder }).__ATHENA_CONTEXT_BUILDER__ =
        contextBuilder;
    }
  }, [adapters, aiService, isConfigured]);

  // This component renders nothing
  return null;
}
