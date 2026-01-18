import { appState$ } from '@/store/state';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { ValidationOptions, ValidationReport } from '../types/reports';
import { validationState$ } from './validationState';
import { rulesEngine, buildValidationContext, buildValidationReport } from '../engine';
import { registerMvpRules } from '../rules';
import type { ClusterMemberWithClusterId } from '../engine';

// Track if rules have been registered
let rulesRegistered = false;

/**
 * Ensure MVP rules are registered (idempotent).
 */
function ensureRulesRegistered(): void {
  if (!rulesRegistered) {
    registerMvpRules();
    rulesRegistered = true;
  }
}

/**
 * Run validation against the current graph state.
 * Updates the validation store with results.
 */
export async function runValidation(
  options?: ValidationOptions
): Promise<ValidationReport> {
  ensureRulesRegistered();

  validationState$.isValidating.set(true);
  const startTime = Date.now();

  try {
    // Get current data from app state
    const notes = Object.values(appState$.entities.notes.get());
    const connections = Object.values(appState$.connections.items.get());
    const clusters = Object.values(appState$.clusters.items.get());
    const suggestedConnections = appState$.suggestions.connections.get();

    // Build cluster members flat list from clusters
    const clusterMembers: ClusterMemberWithClusterId[] = [];
    for (const cluster of clusters) {
      if (cluster.members) {
        for (const member of cluster.members) {
          clusterMembers.push({
            ...member,
            cluster_id: cluster.id,
          });
        }
      }
    }

    // Build validation context
    const context = buildValidationContext({
      entities: notes,
      connections,
      clusters,
      clusterMembers,
      suggestedConnections,
    });

    // Run evaluation
    const { violations, rulesRun } = rulesEngine.evaluate(context, {
      ruleIds: options?.ruleIds,
      includeDisabled: options?.includeDisabled,
    });

    // Build report
    const report = buildValidationReport({
      violations,
      rulesRun,
      context,
      startTime,
    });

    // Update state
    validationState$.violations.set(report.violations);
    validationState$.lastReport.set(report);
    validationState$.lastValidatedAt.set(new Date().toISOString());

    return report;
  } finally {
    validationState$.isValidating.set(false);
  }
}

/**
 * Dismiss a violation (user chose "won't fix").
 * The violation is kept but marked as dismissed for filtering.
 */
export function dismissViolation(violationId: string): void {
  const dismissed = validationState$.dismissedViolationIds.get();
  if (!dismissed.includes(violationId)) {
    validationState$.dismissedViolationIds.set([...dismissed, violationId]);
  }
}

/**
 * Un-dismiss a previously dismissed violation.
 */
export function undismissViolation(violationId: string): void {
  const dismissed = validationState$.dismissedViolationIds.get();
  validationState$.dismissedViolationIds.set(
    dismissed.filter((id) => id !== violationId)
  );
}

/**
 * Clear all violations and reset state.
 */
export function clearViolations(): void {
  validationState$.violations.set([]);
  validationState$.lastReport.set(null);
  validationState$.lastValidatedAt.set(null);
  // Note: dismissedViolationIds are NOT cleared — they persist
}

/**
 * Apply an auto-fix for a violation.
 *
 * Requires the connection adapter to be passed since this action
 * runs outside React context.
 *
 * Returns true if fix was applied successfully.
 */
export async function applyViolationFix(
  violationId: string,
  connectionAdapter: IConnectionAdapter
): Promise<boolean> {
  const violations = validationState$.violations.get();
  const violation = violations.find((v) => v.id === violationId);

  if (!violation) {
    console.warn(`Violation not found: ${violationId}`);
    return false;
  }

  if (!violation.suggestion?.autoApplicable) {
    console.warn(`Violation ${violationId} does not have an auto-applicable fix`);
    return false;
  }

  try {
    switch (violation.ruleId) {
      case 'self-loop': {
        // Delete the self-loop connection
        await connectionAdapter.delete(violation.focusId);
        // Remove from app state
        const selfLoopItems = { ...appState$.connections.items.get() };
        delete selfLoopItems[violation.focusId];
        appState$.connections.items.set(selfLoopItems);
        break;
      }

      case 'duplicate-connection': {
        // Delete the duplicate connection (the focusId is the duplicate)
        await connectionAdapter.delete(violation.focusId);
        // Remove from app state
        const dupItems = { ...appState$.connections.items.get() };
        delete dupItems[violation.focusId];
        appState$.connections.items.set(dupItems);
        break;
      }

      default:
        console.warn(`No auto-fix handler for rule: ${violation.ruleId}`);
        return false;
    }

    // Remove the violation from state
    validationState$.violations.set(
      violations.filter((v) => v.id !== violationId)
    );

    return true;
  } catch (error) {
    console.error(`Failed to apply fix for violation ${violationId}:`, error);
    return false;
  }
}

/**
 * Get violations excluding dismissed ones.
 */
export function getActiveViolations() {
  const violations = validationState$.violations.get();
  const dismissed = validationState$.dismissedViolationIds.get();
  return violations.filter((v) => !dismissed.includes(v.id));
}
