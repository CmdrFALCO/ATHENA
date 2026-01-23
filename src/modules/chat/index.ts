/**
 * Chat module - Conversational interface for knowledge capture
 * WP 7.1 - Chat UI & State
 * WP 7.2 - GraphRAG Context Builder
 * WP 7.3 - Conversational Generation (AI streaming)
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
export { ChatServiceInitializer } from './components/ChatServiceInitializer';

// Store
export { chatState$ } from './store/chatState';
export { chatActions } from './store/chatActions';

// Services
export { chatPersistence } from './services/ChatPersistence';
export { ContextBuilder } from './services/ContextBuilder';
export { ContextFormatter } from './services/ContextFormatter';

// WP 7.3: ChatService and prompt templates
export {
  ChatService,
  initChatService,
  getChatService,
  isChatServiceReady,
  resetChatService,
} from './services/ChatService';
export {
  formatSystemPrompt,
  KNOWLEDGE_CAPTURE_SYSTEM_PROMPT,
  SIMPLE_CHAT_SYSTEM_PROMPT,
} from './services/promptTemplates';

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
