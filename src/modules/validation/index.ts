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

// Rules
export {
  // Structural
  orphanNoteRule,
  selfLoopRule,
  duplicateConnectionRule,
  bidirectionalConnectionRule,
  // Quality
  weaklyConnectedRule,
  staleSuggestionRule,
  // All MVP rules + registration helper
  mvpRules,
  registerMvpRules,
} from './rules';

// Store
export { validationState$ } from './store';
export type { ValidationState } from './store';
export {
  runValidation,
  dismissViolation,
  undismissViolation,
  clearViolations,
  applyViolationFix,
  getActiveViolations,
} from './store';

// Hooks
export { useValidation, useViolations, useViolationsFor } from './hooks';
export type { UseViolationsOptions, UseViolationsForOptions } from './hooks';

// Service
export { SimpleValidationService, validationService } from './services';
