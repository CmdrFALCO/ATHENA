/**
 * FeedbackBuilder — Constructs structured feedback from violations
 *
 * The bridge between Phase 5A validation output (Violation[]) and
 * Phase 7 LLM input (CorrectionFeedback[]). This is central to the
 * corrective feedback loop innovation: instead of just rejecting
 * invalid proposals, we tell the LLM exactly what went wrong and
 * how to fix it.
 *
 * @module axiom/engine/FeedbackBuilder
 */

import type { Violation, ViolationFixType } from '@/modules/validation/types';
import type { CorrectionFeedback } from '../types/feedback';

/**
 * Map ViolationFixType → CorrectionFeedback suggestion action
 */
const FIX_TYPE_TO_ACTION: Record<
  ViolationFixType,
  CorrectionFeedback['suggestion'] extends infer S
    ? S extends { action: infer A }
      ? A
      : never
    : never
> = {
  delete_connection: 'remove',
  delete_entity: 'remove',
  create_connection: 'modify',
  update_property: 'modify',
  manual: 'rephrase',
};

/** Known constraint descriptions keyed by rule ID */
const CONSTRAINT_DESCRIPTIONS: Record<string, string> = {
  'orphan-note': 'Notes must have at least one connection',
  'self-loop': 'Connections cannot link a note to itself',
  'duplicate-connection': 'No duplicate connections between same notes',
  'bidirectional-connection': 'Bidirectional connections should be intentional',
  'weakly-connected': 'Notes should have more than one connection',
  'stale-suggestion': 'AI suggestions should be reviewed promptly',
};

/** Known Level 2 rule IDs (Phase 5A structural/constraint rules) */
const LEVEL_2_RULES = new Set([
  'orphan-note',
  'self-loop',
  'duplicate-connection',
  'bidirectional-connection',
  'weakly-connected',
  'stale-suggestion',
]);

/** Known expected values for common violations */
const EXPECTED_VALUES: Record<string, unknown> = {
  'self-loop': 'source !== target',
  'duplicate-connection': 'unique connection',
  'orphan-note': 'at least 1 connection',
  'weakly-connected': 'at least 2 connections',
};

/**
 * FeedbackBuilder — Constructs CorrectionFeedback from Violations
 */
export class FeedbackBuilder {
  /**
   * Convert Phase 5A Violations into AXIOM CorrectionFeedback.
   */
  static fromViolations(
    violations: Violation[],
    attemptNumber: number,
    maxAttempts: number,
  ): CorrectionFeedback[] {
    return violations.map((v) =>
      this.fromViolation(v, attemptNumber, maxAttempts),
    );
  }

  /**
   * Convert a single Violation into CorrectionFeedback.
   */
  static fromViolation(
    violation: Violation,
    attemptNumber: number,
    maxAttempts: number,
  ): CorrectionFeedback {
    return {
      ruleId: violation.ruleId,
      constraint: this.getConstraintDescription(violation.ruleId),
      level: this.inferLevel(violation.ruleId),
      severity: violation.severity,
      actual: violation.offendingValue ?? violation.focusId,
      expected: this.inferExpected(violation),
      message: violation.message,
      suggestion: this.convertSuggestion(violation.suggestion),
      attemptNumber,
      maxAttempts,
    };
  }

  /**
   * Build feedback for a custom error (not from Phase 5A validation).
   */
  static custom(
    ruleId: string,
    message: string,
    options: {
      level?: 1 | 2 | 3;
      severity?: 'error' | 'warning';
      actual?: unknown;
      expected?: unknown;
      suggestion?: CorrectionFeedback['suggestion'];
      attemptNumber: number;
      maxAttempts: number;
    },
  ): CorrectionFeedback {
    return {
      ruleId,
      constraint: message,
      level: options.level ?? 2,
      severity: options.severity ?? 'error',
      actual: options.actual,
      expected: options.expected,
      message,
      suggestion: options.suggestion,
      attemptNumber: options.attemptNumber,
      maxAttempts: options.maxAttempts,
    };
  }

  /**
   * Get human-readable constraint description for a rule ID.
   */
  private static getConstraintDescription(ruleId: string): string {
    return CONSTRAINT_DESCRIPTIONS[ruleId] ?? `Constraint: ${ruleId}`;
  }

  /**
   * Infer validation level from rule ID.
   * Level 1: Schema (structure)
   * Level 2: Constraints (rules)
   * Level 3: Semantic (embeddings)
   */
  private static inferLevel(ruleId: string): 1 | 2 | 3 {
    if (ruleId.startsWith('schema-')) return 1;
    if (ruleId.startsWith('semantic-')) return 3;
    if (LEVEL_2_RULES.has(ruleId)) return 2;
    return 2; // Default to constraint level
  }

  /**
   * Infer what was expected based on violation type.
   */
  private static inferExpected(violation: Violation): unknown {
    return (
      EXPECTED_VALUES[violation.ruleId] ??
      violation.suggestion?.description ??
      null
    );
  }

  /**
   * Convert Phase 5A ViolationSuggestion to AXIOM feedback suggestion format.
   */
  private static convertSuggestion(
    suggestion?: Violation['suggestion'],
  ): CorrectionFeedback['suggestion'] | undefined {
    if (!suggestion) return undefined;

    return {
      action: FIX_TYPE_TO_ACTION[suggestion.type] ?? 'modify',
      details: suggestion.description,
    };
  }
}

/**
 * Utility: map a ViolationFixType to a CorrectionFeedback suggestion action.
 */
export function mapFixTypeToAction(
  fixType: ViolationFixType,
): 'modify' | 'remove' | 'merge' | 'rephrase' {
  return FIX_TYPE_TO_ACTION[fixType] ?? 'modify';
}
