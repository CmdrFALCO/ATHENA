import type { ValidationSeverity } from './rules';

/**
 * Types of automated fixes that can be suggested
 */
export type ViolationFixType =
  | 'create_connection'
  | 'delete_connection'
  | 'delete_entity'
  | 'update_property'
  | 'manual';

/**
 * A suggested fix for a violation
 */
export interface ViolationSuggestion {
  /** What type of fix this is */
  type: ViolationFixType;

  /** Human-readable description of the fix */
  description: string;

  /** Parameters needed to execute the fix (if automatable) */
  params?: Record<string, unknown>;

  /** Can this be auto-applied? */
  autoApplicable: boolean;
}

/**
 * Focus type for violations — what kind of element failed validation
 */
export type ViolationFocusType = 'entity' | 'connection' | 'cluster';

/**
 * A single validation violation (SHACL ValidationResult inspired).
 * Represents one instance where a rule detected a problem.
 */
export interface Violation {
  /** Unique ID for this violation instance */
  id: string;

  /** Which rule produced this violation */
  ruleId: string;

  /** Severity inherited from rule */
  severity: ValidationSeverity;

  /** The "focus node" — what failed validation */
  focusType: ViolationFocusType;
  focusId: string;

  /** Human-readable message explaining the violation */
  message: string;

  /** Optional: specific property that failed */
  propertyPath?: string;

  /** Optional: the offending value */
  offendingValue?: unknown;

  /** Optional: suggested fix action */
  suggestion?: ViolationSuggestion;

  /** When this violation was detected (ISO datetime) */
  detectedAt: string;
}

/**
 * How a violation was resolved
 */
export type ViolationResolutionType = 'fixed' | 'dismissed' | 'wont_fix';

/**
 * Resolution record for a violation
 */
export interface ViolationResolution {
  type: ViolationResolutionType;
  note?: string;
  resolvedAt: string;
}
