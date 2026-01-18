import { observe } from '@legendapp/state';
import type { IValidationService } from '../interfaces/IValidationService';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { Violation, ViolationResolution, ViolationFocusType } from '../types/violations';
import type { ValidationReport, ValidationOptions } from '../types/reports';
import {
  validationState$,
  runValidation,
  dismissViolation,
  applyViolationFix,
} from '../store';

/**
 * Simple validation service implementing IValidationService.
 *
 * This is the Phase 5A implementation — uses the rules engine directly.
 * Phase 5B will swap this with CPNValidationOrchestrator.
 *
 * UI components depend only on IValidationService interface.
 */
export class SimpleValidationService implements IValidationService {
  private connectionAdapter: IConnectionAdapter | null = null;

  /**
   * Set the connection adapter for auto-fix operations.
   * Must be called during app initialization.
   */
  setConnectionAdapter(adapter: IConnectionAdapter): void {
    this.connectionAdapter = adapter;
  }

  /**
   * Run validation and return a report.
   */
  async validate(options?: ValidationOptions): Promise<ValidationReport> {
    return runValidation(options);
  }

  /**
   * Get current violations (from last validation run).
   */
  getViolations(): Violation[] {
    return validationState$.violations.get();
  }

  /**
   * Get violations for a specific entity/connection/cluster.
   */
  getViolationsFor(focusType: ViolationFocusType, focusId: string): Violation[] {
    const violations = validationState$.violations.get();
    return violations.filter(
      (v) => v.focusType === focusType && v.focusId === focusId
    );
  }

  /**
   * Mark a violation as resolved.
   * For now, only 'dismissed' is implemented (user chose "won't fix").
   */
  resolveViolation(violationId: string, resolution: ViolationResolution): void {
    if (resolution.type === 'dismissed' || resolution.type === 'wont_fix') {
      dismissViolation(violationId);
    }
    // 'fixed' resolution is handled by applyFix
  }

  /**
   * Attempt to auto-fix a violation.
   * Returns true if fix was applied successfully.
   */
  async applyFix(violationId: string): Promise<boolean> {
    if (!this.connectionAdapter) {
      console.error(
        'SimpleValidationService: connectionAdapter not set. ' +
          'Call setConnectionAdapter() during app initialization.'
      );
      return false;
    }

    return applyViolationFix(violationId, this.connectionAdapter);
  }

  /**
   * Subscribe to violation changes.
   * Returns unsubscribe function.
   */
  onViolationsChanged(callback: (violations: Violation[]) => void): () => void {
    return observe(validationState$.violations, ({ value }) => {
      // Filter out any undefined elements from Legend-State array
      const violations = (value ?? []).filter((v): v is Violation => v !== undefined);
      callback(violations);
    });
  }

  /**
   * Check if validation is currently running.
   */
  isValidating(): boolean {
    return validationState$.isValidating.get();
  }

  /**
   * Get the last validation report (or null if never run).
   */
  getLastReport(): ValidationReport | null {
    return validationState$.lastReport.get();
  }
}

/**
 * Singleton instance for convenience.
 */
export const validationService = new SimpleValidationService();
