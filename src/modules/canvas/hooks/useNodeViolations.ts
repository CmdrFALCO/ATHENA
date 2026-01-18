import { useViolationsFor } from '@/modules/validation';

/**
 * Hook to get violation data for a specific entity node.
 * Used by EntityNode to display violation badges and glow effects.
 */
export function useNodeViolations(entityId: string) {
  const { violations, errorCount, warningCount, hasErrors, hasWarnings } =
    useViolationsFor('entity', entityId);

  return {
    violations,
    errorCount,
    warningCount,
    hasErrors,
    hasWarnings,
    // Computed: worst severity for badge color
    badgeSeverity: hasErrors ? 'error' : hasWarnings ? 'warning' : null,
    totalCount: errorCount + warningCount,
  };
}
