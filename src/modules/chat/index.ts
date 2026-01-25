/**
 * Chat module - Conversational interface for knowledge capture
 * WP 7.1 - Chat UI & State
 * WP 7.2 - GraphRAG Context Builder
 * WP 7.3 - Conversational Generation (AI streaming)
 * WP 7.4 - Knowledge Extraction Parser
 * WP 7.6 - Spatial Awareness (@mentions, canvas selection)
 *
 * Provides slide-over chat panel with message persistence,
 * thread management, Legend-State infrastructure, and
 * proposal extraction from AI responses.
 */

// Components
export { ChatPanel, ChatToggleButton } from './components';
export { ChatHeader } from './components/ChatHeader';
export { ChatMessages } from './components/ChatMessages';
export { ChatMessage } from './components/ChatMessage';
export { ChatInput } from './components/ChatInput';
export { ChatServiceInitializer } from './components/ChatServiceInitializer';
// WP 7.6: Spatial Awareness components
export { MentionInput } from './components/MentionInput';
export { MentionSuggestions } from './components/MentionSuggestions';
export { ContextChips } from './components/ContextChips';

// Hooks (WP 7.6)
export { useMentions, type MentionSuggestion } from './hooks/useMentions';
export { useCanvasSelection } from './hooks/useCanvasSelection';

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

// WP 7.4: Proposal extraction
export {
  extractProposals,
  stripProposalBlock,
  hasProposalBlock,
  resolveProposalReferences,
  canCreateEdge,
} from './services/ProposalParser';
export type { ExtractionResult } from './services/ProposalParser';

export {
  SelfCorrectingExtractor,
  getSelfCorrectingExtractor,
  resetSelfCorrectingExtractor,
} from './services/SelfCorrectingExtractor';
export type { SelfCorrectionResult } from './services/SelfCorrectingExtractor';

export {
  RawProposalsSchema,
  RawNodeProposalSchema,
  RawEdgeProposalSchema,
  formatZodErrors,
} from './services/proposalSchema';
export type {
  RawProposals,
  RawNodeProposal,
  RawEdgeProposal,
} from './services/proposalSchema';

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
