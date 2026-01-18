import { observable } from '@legendapp/state';
import type { Violation } from '../types/violations';
import type { ValidationReport } from '../types/reports';

/**
 * Validation state slice.
 * Kept separate from main appState$ for clean module isolation.
 */
export interface ValidationState {
  /** Current violations from last validation run */
  violations: Violation[];

  /** Last validation report */
  lastReport: ValidationReport | null;

  /** Whether validation is currently running */
  isValidating: boolean;

  /** ISO timestamp of last validation */
  lastValidatedAt: string | null;

  /** IDs of violations user has dismissed (won't fix) */
  dismissedViolationIds: string[];
}

export const validationState$ = observable<ValidationState>({
  violations: [],
  lastReport: null,
  isValidating: false,
  lastValidatedAt: null,
  dismissedViolationIds: [],
});

// Export for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_VALIDATION_STATE__: typeof validationState$ })
    .__ATHENA_VALIDATION_STATE__ = validationState$;
}
