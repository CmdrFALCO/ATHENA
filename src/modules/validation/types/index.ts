// Validation Types Barrel Export

// Rules and context
export type {
  ValidationSeverity,
  ValidationTarget,
  ValidationContext,
  ValidationRule,
} from './rules';

// Violations
export type {
  ViolationFixType,
  ViolationSuggestion,
  ViolationFocusType,
  Violation,
  ViolationResolutionType,
  ViolationResolution,
} from './violations';

// Reports and options
export type {
  ValidationSummary,
  ValidationReport,
  ValidationScope,
  ValidationOptions,
} from './reports';
