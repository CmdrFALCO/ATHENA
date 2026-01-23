/**
 * Chat module - Conversational interface for knowledge capture
 * WP 7.1 - Chat UI & State
 * WP 7.2 - GraphRAG Context Builder
 *
 * Provides slide-over chat panel with message persistence,
 * thread management, and Legend-State infrastructure.
 */

// Components
export { ChatPanel, ChatToggleButton } from './components';
export { ChatHeader } from './components/ChatHeader';
export { ChatMessages } from './components/ChatMessages';
export { ChatMessage } from './components/ChatMessage';
export { ChatInput } from './components/ChatInput';

// Store
export { chatState$ } from './store/chatState';
export { chatActions } from './store/chatActions';

// Services
export { chatPersistence } from './services/ChatPersistence';
export { ContextBuilder } from './services/ContextBuilder';
export { ContextFormatter } from './services/ContextFormatter';

// Types
export type {
  ChatMessage as ChatMessageType,
  ChatThread,
  ChatState,
  KnowledgeProposals,
  NodeProposal,
  EdgeProposal,
} from './types';

// Context Types (WP 7.2)
export type {
  ContextItem,
  ContextOptions,
  ContextResult,
  IContextStrategy,
} from './services/contextStrategies/types';
