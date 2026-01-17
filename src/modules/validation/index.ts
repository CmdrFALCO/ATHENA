// Validation Module Barrel Export

// All types
export type {
  // Rules and context
  ValidationSeverity,
  ValidationTarget,
  ValidationContext,
  ValidationRule,
  // Violations
  ViolationFixType,
  ViolationSuggestion,
  ViolationFocusType,
  Violation,
  ViolationResolutionType,
  ViolationResolution,
  // Reports and options
  ValidationSummary,
  ValidationReport,
  ValidationScope,
  ValidationOptions,
} from './types';

// Interface
export type { IValidationService } from './interfaces/IValidationService';

// Engine
export {
  RulesEngine,
  rulesEngine,
  buildValidationContext,
  buildValidationReport,
} from './engine';
export type {
  ContextBuilderInput,
  ClusterMemberWithClusterId,
  ReportBuilderInput,
} from './engine';
