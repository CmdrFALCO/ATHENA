/**
 * WP 9B.8: Multi-Agent Council Types
 *
 * Three-agent council (Generator, Critic, Synthesizer) that produces
 * pre-critiqued proposals feeding into the existing AXIOM validation pipeline.
 */

import type { KnowledgeProposals } from '@/modules/chat/types';

// ============================================
// Agent Roles
// ============================================

export type AgentRole = 'generator' | 'critic' | 'synthesizer';

// ============================================
// Critique Annotations
// ============================================

/** Critique annotation from the Critic agent */
export interface CritiqueAnnotation {
  proposalIndex: number;
  verdict: 'accept' | 'challenge' | 'reject';
  objections: string[];
  severity: 'blocking' | 'concern' | 'minor';
  suggestion?: string;
}

// ============================================
// Council Events (streamed during execution)
// ============================================

export type CouncilEvent =
  | { type: 'agent_start'; agent: AgentRole }
  | { type: 'agent_complete'; agent: AgentRole; durationMs: number; summary: string }
  | { type: 'proposals_ready'; proposals: KnowledgeProposals; councilNotes: string[] }
  | { type: 'council_complete'; sessionId: string }
  | { type: 'council_empty'; reason: string }
  | { type: 'council_error'; error: string; agent?: AgentRole };

// ============================================
// Persisted Council Session
// ============================================

export interface CouncilSession {
  id: string;
  correlationId: string;
  query: string;
  contextNodeIds: string[];
  generatorResponse: string;
  criticResponse: string;
  synthesizerResponse: string;
  proposalsCount: number;
  droppedCount: number;
  totalDurationMs: number;
  agentTimings: Record<AgentRole, number>;
  councilNotes: string[];
  createdAt: string;
}

// ============================================
// Council Configuration (for DevSettings)
// ============================================

export interface CouncilConfig {
  /** Master toggle */
  enabled: boolean;
  /** Per-agent settings */
  agents: {
    generator: { systemPrompt: string };
    critic: { systemPrompt: string };
    synthesizer: { systemPrompt: string };
  };
  /** Suggestion heuristic settings */
  suggestions: {
    enabled: boolean;
    minContextNodes: number;
    crossCommunityThreshold: number;
  };
  /** Confidence scoring integration */
  confidence: {
    councilVettedWeight: number;
  };
  /** UI settings */
  ui: {
    showAgentTimings: boolean;
    maxPastSessions: number;
  };
  /** Per-backend enable/disable for cost control */
  perBackendEnabled: Record<string, boolean>;
}

// ============================================
// Council State (Legend-State)
// ============================================

export interface CouncilState {
  activeSession: {
    running: boolean;
    currentAgent: AgentRole | null;
    events: CouncilEvent[];
    sessionId: string | null;
  };
  pastSessions: CouncilSession[];
  selectedPastSessionId: string | null;
}
