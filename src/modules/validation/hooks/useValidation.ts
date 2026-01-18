import { useSelector } from '@legendapp/state/react';
import type { ValidationReport, ValidationOptions } from '../types/reports';
import { validationState$, runValidation, clearViolations } from '../store';

/**
 * Main validation hook for components.
 *
 * Provides reactive access to validation state and actions.
 */
export function useValidation() {
  const isValidating = useSelector(() => validationState$.isValidating.get());
  const lastReport = useSelector(() => validationState$.lastReport.get());
  const lastValidatedAt = useSelector(() => validationState$.lastValidatedAt.get());
  const violations = useSelector(() => validationState$.violations.get());
  const dismissedIds = useSelector(() => validationState$.dismissedViolationIds.get());

  // Compute counts excluding dismissed violations
  const activeViolations = violations.filter((v) => !dismissedIds.includes(v.id));
  const errorCount = activeViolations.filter((v) => v.severity === 'error').length;
  const warningCount = activeViolations.filter((v) => v.severity === 'warning').length;
  const totalCount = activeViolations.length;

  return {
    // State
    isValidating,
    lastReport,
    lastValidatedAt,

    // Counts (computed, excluding dismissed)
    errorCount,
    warningCount,
    totalCount,

    // Actions
    runValidation: async (options?: ValidationOptions): Promise<ValidationReport> => {
      return runValidation(options);
    },
    clearViolations,
  };
}
