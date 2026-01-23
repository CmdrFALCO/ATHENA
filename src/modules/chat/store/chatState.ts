import { observable } from '@legendapp/state';
import type { ChatState } from '../types';

/**
 * Chat state slice.
 * Kept separate from main appState$ for clean module isolation.
 * WP 7.1 - Chat UI & State
 */
export const chatState$ = observable<ChatState>({
  threads: {},
  messages: {},
  activeThreadId: null,
  isOpen: false,
  isLoading: false,
  streamingContent: null,
});

// Export for debugging (matches pattern from other modules)
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_CHAT_STATE__: typeof chatState$ })
    .__ATHENA_CHAT_STATE__ = chatState$;
}
