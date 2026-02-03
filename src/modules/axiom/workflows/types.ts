/**
 * Workflow-specific types for the Validation CPN
 *
 * Defines place/transition IDs as const objects for type-safe references,
 * payload types at each workflow stage, and the placeholder contract
 * for Phase 5A integration (WP 9A.4).
 *
 * @module axiom/workflows/types
 */

import type { PROPOSAL, VALIDATION_RESULT } from '../types/colorSets';
import type { CorrectionFeedback } from '../types/feedback';
import type { PlaceConfig } from '../types/place';
import type { TransitionConfig } from '../types/transition';
import type { TransitionRecord } from '../types/token';

/** Place IDs — single source of truth */
export const PLACE_IDS = {
  P_proposals: 'P_proposals',
  P_validating: 'P_validating',
  P_deciding: 'P_deciding',
  P_verified: 'P_verified',
  P_feedback: 'P_feedback',
  P_committed: 'P_committed',
  P_rejected: 'P_rejected',
  // WP 9B.1: Critique places
  P_critiqued: 'P_critiqued',
  P_escalated: 'P_escalated',
} as const;

export type PlaceId = (typeof PLACE_IDS)[keyof typeof PLACE_IDS];

/** Transition IDs — single source of truth */
export const TRANSITION_IDS = {
  T_validate: 'T_validate',
  T_accept: 'T_accept',
  T_prepare_retry: 'T_prepare_retry',
  T_regenerate: 'T_regenerate',
  T_reject: 'T_reject',
  T_commit: 'T_commit',
  // WP 9B.1: Critique transitions
  T_critique: 'T_critique',
  T_skip_critique: 'T_skip_critique',
  T_critique_accept: 'T_critique_accept',
  T_critique_escalate: 'T_critique_escalate',
  T_critique_reject: 'T_critique_reject',
} as const;

export type TransitionId = (typeof TRANSITION_IDS)[keyof typeof TRANSITION_IDS];

/**
 * Token payload after validation — carries both the original proposal
 * and the validation result so downstream transitions can access both.
 */
export type ValidatedPayload = PROPOSAL & {
  validationResult: VALIDATION_RESULT;
};

/**
 * Placeholder function signatures for Phase 5A integration.
 * These will be replaced with real implementations in WP 9A.4.
 */
export interface ValidationPlaceholders {
  validateProposal: (proposal: PROPOSAL) => Promise<VALIDATION_RESULT>;
  regenerateProposal: (
    proposal: PROPOSAL,
    feedback: CorrectionFeedback[],
  ) => Promise<PROPOSAL>;
  commitProposal: (proposal: PROPOSAL) => Promise<void>;
}

/** Options for creating the validation workflow net */
export interface ValidationNetOptions {
  maxRetries?: number;
  placeholders?: Partial<ValidationPlaceholders>;
}

/** Result of creating the validation net (for inspection/testing) */
export interface ValidationNetResult {
  placeConfigs: PlaceConfig[];
  transitionConfigs: TransitionConfig[];
  placeIds: typeof PLACE_IDS;
  transitionIds: typeof TRANSITION_IDS;
}

/** Workflow execution result */
export interface WorkflowResult {
  success: boolean;
  finalPlace: string;
  totalSteps: number;
  totalRetries: number;
  feedbackHistory: CorrectionFeedback[];
  transitionHistory: TransitionRecord[];
}
