/**
 * Chat module types
 * WP 7.1 - Chat UI & State
 */

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposals?: KnowledgeProposals; // For WP 7.4, leave as optional
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  contextNodeIds: string[]; // Nodes explicitly included in context
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  threads: Record<string, ChatThread>;
  messages: Record<string, ChatMessage[]>; // threadId → messages
  activeThreadId: string | null;
  isOpen: boolean;
  isLoading: boolean;
  streamingContent: string | null; // For streaming display (WP 7.3)
}

// Placeholder for WP 7.4 (Knowledge Extraction Parser)
export interface KnowledgeProposals {
  nodes: NodeProposal[];
  edges: EdgeProposal[];
  /** Optional metadata for tracking proposal source (WP 9B.8) */
  metadata?: {
    source?: 'chat' | 'council';
    councilVetted?: number;
    councilSessionId?: string;
  };
}

export interface NodeProposal {
  id: string;
  title: string;
  content: string;
  suggestedConnections: string[];
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface EdgeProposal {
  id: string;
  fromTitle: string;
  toTitle: string;
  fromId?: string;
  toId?: string;
  label: string;
  rationale: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
}
