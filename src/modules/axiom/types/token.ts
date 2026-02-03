/**
 * AetherToken — The fundamental unit flowing through the CPN
 *
 * Every token carries its complete history for auditability (Principle 3)
 * and every state change records a reason (Principle 2).
 *
 * @module axiom/types/token
 */

import type { TokenColor } from './colorSets';
import type { CorrectionFeedback } from './feedback';
import type { CRITIQUE_RESULT } from './critique';

/**
 * AetherToken — A typed token carrying payload through the CPN
 *
 * Carries complete metadata for auditability (Principle 3).
 * All metadata is exposed, not hidden (Principle 1).
 */
export interface AetherToken<T = unknown> {
  /** The data this token carries */
  payload: T;

  /** Current color (maps to CPN place type) */
  color: TokenColor;

  /** How many times this token has been retried */
  retryCount: number;

  /** Maximum allowed retries before escalation/rejection */
  maxRetries: number;

  /** Accumulated feedback from ALL previous attempts */
  feedbackHistory: CorrectionFeedback[];

  /** Full metadata for auditability — always accessible (Principle 1) */
  _meta: TokenMetadata;
}

/**
 * TokenMetadata — Complete audit trail for a token
 */
export interface TokenMetadata {
  /** Unique token ID */
  id: string;

  /** Groups related tokens across retries */
  correlationId: string;

  /** When this token was created (ISO timestamp) */
  createdAt: string;

  /** Current CPN place */
  currentPlace: string;

  /** Previous CPN place (undefined for newly created tokens) */
  previousPlace?: string;

  /** Full audit trail of all transitions (Principle 3) */
  transitionHistory: TransitionRecord[];

  /** Which model generated this (for proposals) */
  generationModel?: string;

  /** How long generation took (ms) */
  generationLatencyMs?: number;

  /** Validation results log */
  validationTrace: ValidationRecord[];

  /** All constraints that were checked */
  constraintsChecked: string[];

  /** Constraints that passed */
  constraintsPassed: string[];

  /** Constraints that failed */
  constraintsFailed: string[];

  // Critique tracking (WP 9B.1)
  /** Result from Devil's Advocate agent */
  critiqueResult?: CRITIQUE_RESULT;
  /** How long the critique took (ms) */
  critiqueDurationMs?: number;
  /** True if critique was skipped (fast path) */
  critiqueSkipped?: boolean;
  /** Reason critique was skipped */
  critiqueSkipReason?: string;
}

/**
 * TransitionRecord — Records a single CPN transition firing
 *
 * Every transition MUST record a `reason` (Principle 2: Transparency).
 */
export interface TransitionRecord {
  /** Which transition fired */
  transitionId: string;

  /** When it fired (ISO timestamp) */
  firedAt: string;

  /** Source place */
  fromPlace: string;

  /** Destination place */
  toPlace: string;

  /** How long the transition took (ms) */
  durationMs: number;

  /** Which guards passed/failed */
  guardResults: Record<string, boolean>;

  /** CRITICAL: Why this transition fired (Principle 2) */
  reason: string;
}

/**
 * ValidationRecord — Records a single validation check
 */
export interface ValidationRecord {
  ruleId: string;
  passed: boolean;
  checkedAt: string;
  durationMs: number;
  details?: unknown;
}

/**
 * Factory function to create tokens with proper metadata.
 *
 * Generates a unique ID and sets up the initial metadata structure.
 */
export function createToken<T>(
  payload: T,
  options: {
    color: TokenColor;
    correlationId?: string;
    maxRetries?: number;
    currentPlace: string;
  },
): AetherToken<T> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const correlationId = options.correlationId ?? crypto.randomUUID();

  return {
    payload,
    color: options.color,
    retryCount: 0,
    maxRetries: options.maxRetries ?? 3,
    feedbackHistory: [],
    _meta: {
      id,
      correlationId,
      createdAt: now,
      currentPlace: options.currentPlace,
      previousPlace: undefined,
      transitionHistory: [],
      validationTrace: [],
      constraintsChecked: [],
      constraintsPassed: [],
      constraintsFailed: [],
    },
  };
}
