import { useViolationsFor } from '@/modules/validation';

/**
 * Hook to get violation data for a specific connection edge.
 * Used by ConnectionEdge to style edges with violation colors.
 */
export function useEdgeViolations(connectionId: string) {
  const { violations, errorCount, warningCount, hasErrors, hasWarnings } =
    useViolationsFor('connection', connectionId);

  return {
    violations,
    errorCount,
    warningCount,
    hasErrors,
    hasWarnings,
    // Determine edge styling based on violations
    edgeStyle: hasErrors ? 'error' : hasWarnings ? 'warning' : null,
  };
}
