import { useSelector } from '@legendapp/state/react';
import { useConnectionAdapter } from '@/adapters/hooks';
import type { Violation } from '../types/violations';
import type { ValidationSeverity } from '../types/rules';
import {
  validationState$,
  dismissViolation,
  undismissViolation,
  applyViolationFix,
} from '../store';

export interface UseViolationsOptions {
  /** Filter by severity */
  severity?: ValidationSeverity;
  /** Filter by rule ID */
  ruleId?: string;
  /** Include dismissed violations (default: false) */
  includeDismissed?: boolean;
}

/**
 * Hook for accessing all violations with filtering options.
 */
export function useViolations(options?: UseViolationsOptions) {
  const { severity, ruleId, includeDismissed = false } = options || {};

  const connectionAdapter = useConnectionAdapter();

  const allViolations = useSelector(() => validationState$.violations.get());
  const dismissedIds = useSelector(() => validationState$.dismissedViolationIds.get());

  // Apply filters
  let violations: Violation[] = allViolations;

  // Filter out dismissed unless requested
  if (!includeDismissed) {
    violations = violations.filter((v) => !dismissedIds.includes(v.id));
  }

  // Filter by severity
  if (severity) {
    violations = violations.filter((v) => v.severity === severity);
  }

  // Filter by ruleId
  if (ruleId) {
    violations = violations.filter((v) => v.ruleId === ruleId);
  }

  return {
    violations,

    dismissViolation: (id: string) => {
      dismissViolation(id);
    },

    undismissViolation: (id: string) => {
      undismissViolation(id);
    },

    applyFix: async (id: string): Promise<boolean> => {
      return applyViolationFix(id, connectionAdapter);
    },
  };
}
