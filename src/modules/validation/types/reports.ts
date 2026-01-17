import type { Violation } from './violations';

/**
 * Summary statistics for a validation report
 */
export interface ValidationSummary {
  errors: number;
  warnings: number;
  rulesEvaluated: number;
  entitiesChecked: number;
  connectionsChecked: number;
  clustersChecked: number;
}

/**
 * The complete validation report (SHACL ValidationReport inspired).
 * Contains all results from a validation run.
 */
export interface ValidationReport {
  /** When validation was run (ISO datetime) */
  timestamp: string;

  /** Overall conformance — true if no errors (warnings OK) */
  conforms: boolean;

  /** Count summary */
  summary: ValidationSummary;

  /** All violations found */
  violations: Violation[];

  /** Which rules were run (rule IDs) */
  rulesRun: string[];

  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Scope for validation — what to validate
 */
export type ValidationScope = 'full' | 'entity' | 'connection' | 'cluster';

/**
 * Options for validation runs
 */
export interface ValidationOptions {
  /** Validate entire graph or specific scope */
  scope?: ValidationScope;

  /** If scope is entity/connection/cluster, which IDs to validate */
  targetIds?: string[];

  /** Which rules to run (empty = all enabled) */
  ruleIds?: string[];

  /** Include disabled rules? */
  includeDisabled?: boolean;
}
