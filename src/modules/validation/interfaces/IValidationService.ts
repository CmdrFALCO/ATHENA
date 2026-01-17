import type { Violation, ViolationResolution } from '../types/violations';
import type { ValidationReport, ValidationOptions } from '../types/reports';
import type { ViolationFocusType } from '../types/violations';

/**
 * Bridge interface for validation service.
 *
 * Phase 5A: SimpleValidationService implements this
 * Phase 5B: CPNValidationOrchestrator implements this
 *
 * UI components depend only on this interface — they don't know
 * which implementation is behind it.
 */
export interface IValidationService {
  /**
   * Run validation and return a report
   */
  validate(options?: ValidationOptions): Promise<ValidationReport>;

  /**
   * Get current violations (from last validation run)
   */
  getViolations(): Violation[];

  /**
   * Get violations for a specific entity/connection/cluster
   */
  getViolationsFor(focusType: ViolationFocusType, focusId: string): Violation[];

  /**
   * Mark a violation as resolved
   */
  resolveViolation(violationId: string, resolution: ViolationResolution): void;

  /**
   * Attempt to auto-fix a violation (if it has an auto-applicable suggestion).
   * Returns true if fix was applied successfully.
   */
  applyFix(violationId: string): Promise<boolean>;

  /**
   * Subscribe to violation changes.
   * Returns unsubscribe function.
   */
  onViolationsChanged(callback: (violations: Violation[]) => void): () => void;

  /**
   * Check if validation is currently running
   */
  isValidating(): boolean;

  /**
   * Get the last validation report (or null if never run)
   */
  getLastReport(): ValidationReport | null;
}
