/**
 * Color sets following Jensen's CPN notation (Σ)
 *
 * These define the "colors" (types) of tokens that flow through the CPN.
 * Each color set corresponds to a distinct data type in the workflow.
 *
 * @module axiom/types/colorSets
 */

import type { NodeProposal, EdgeProposal } from '@/modules/chat/types';
import type { Violation } from '@/modules/validation/types';
import type { CorrectionFeedback } from './feedback';

/**
 * PROPOSAL — From Der Generator (Phase 7)
 *
 * Represents a batch of proposed knowledge graph modifications
 * produced by the LLM. Carries retry context so the generator
 * can learn from previous failures.
 */
export interface PROPOSAL {
  id: string;
  correlationId: string;
  nodes: NodeProposal[];
  edges: EdgeProposal[];
  attempt: number;
  feedbackHistory: CorrectionFeedback[];
  generatedAt: string;
  generatedBy: string;
}

/**
 * VALIDATION_RESULT — From Der Validator (Phase 5A)
 *
 * The output of running all three validation levels against a proposal.
 */
export interface VALIDATION_RESULT {
  proposalId: string;
  valid: boolean;
  level1Passed: boolean;
  level2Passed: boolean;
  level3Passed: boolean;
  violations: Violation[];
  validatedAt: string;
  durationMs: number;
}

/**
 * FEEDBACK — Structured correction for LLM regeneration
 *
 * This is the key innovation: instead of just rejecting, we tell the LLM
 * exactly what went wrong and how to fix it.
 */
export type FEEDBACK = CorrectionFeedback[];

/**
 * TokenColor — Visual state indication
 *
 * Maps to CPN places. Each color represents where a token
 * currently sits in the workflow.
 */
export type TokenColor =
  | 'proposal'
  | 'generating'
  | 'validating'
  | 'deciding'
  | 'verified'
  | 'feedback'
  | 'critiqued'     // WP 9B.1: Post-critique, awaiting routing
  | 'committed'
  | 'rejected'
  | 'escalated';

/** Colors that represent terminal (sink) states */
export const SINK_COLORS: readonly TokenColor[] = ['committed', 'rejected'] as const;

/** Colors that represent active (in-flight) states */
export const ACTIVE_COLORS: readonly TokenColor[] = [
  'proposal',
  'generating',
  'validating',
  'deciding',
  'feedback',
] as const;
