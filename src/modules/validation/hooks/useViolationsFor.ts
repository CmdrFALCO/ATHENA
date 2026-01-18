import { useSelector } from '@legendapp/state/react';
import type { Violation, ViolationFocusType } from '../types/violations';
import { validationState$ } from '../store';

export interface UseViolationsForOptions {
  /** Include dismissed violations (default: false) */
  includeDismissed?: boolean;
}

/**
 * Hook for violations related to a specific entity or connection.
 *
 * This is used by canvas nodes/edges to show violation badges.
 */
export function useViolationsFor(
  focusType: ViolationFocusType,
  focusId: string,
  options?: UseViolationsForOptions
) {
  const { includeDismissed = false } = options || {};

  const allViolations = useSelector(() => validationState$.violations.get());
  const dismissedIds = useSelector(() => validationState$.dismissedViolationIds.get());

  // Filter to violations for this specific entity/connection
  let violations: Violation[] = allViolations.filter(
    (v) => v.focusType === focusType && v.focusId === focusId
  );

  // Filter out dismissed unless requested
  if (!includeDismissed) {
    violations = violations.filter((v) => !dismissedIds.includes(v.id));
  }

  // Compute counts
  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  return {
    violations,
    errorCount,
    warningCount,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
  };
}
