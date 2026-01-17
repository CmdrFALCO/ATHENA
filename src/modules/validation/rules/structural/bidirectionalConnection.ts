import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Bidirectional Connection Rule
 *
 * Detects when both A->B and B->A connections exist.
 * This is a warning (not error) and disabled by default — sometimes intentional.
 */
export const bidirectionalConnectionRule: ValidationRule = {
  id: 'bidirectional-connection',
  name: 'Bidirectional Connection',
  description:
    'Two separate connections in opposite directions may indicate redundancy.',
  severity: 'warning',
  target: 'connection',
  enabledByDefault: false, // Opt-in — sometimes bidirectional is intentional

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];
    const reported = new Set<string>(); // Track reported pairs to avoid duplicates

    for (const conn of ctx.connections) {
      const forwardKey = `${conn.source_id}<->${conn.target_id}`;
      const reverseKey = `${conn.target_id}<->${conn.source_id}`;

      // Skip if we already reported this pair
      if (reported.has(forwardKey) || reported.has(reverseKey)) continue;

      // Check if reverse connection exists
      const reverseConnections = (
        ctx.connectionsBySource.get(conn.target_id) || []
      ).filter((c) => c.target_id === conn.source_id);

      if (reverseConnections.length > 0) {
        reported.add(forwardKey);
        reported.add(reverseKey);

        const sourceEntity = ctx.entityById.get(conn.source_id);
        const targetEntity = ctx.entityById.get(conn.target_id);

        violations.push({
          id: `bidirectional-${conn.id}`,
          ruleId: 'bidirectional-connection',
          severity: 'warning',
          focusType: 'connection',
          focusId: conn.id,
          message: `Bidirectional connections exist between "${sourceEntity?.title || conn.source_id}" and "${targetEntity?.title || conn.target_id}".`,
          suggestion: {
            type: 'manual',
            description:
              'Review whether both directions are needed, or if one should be removed.',
            autoApplicable: false,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return violations;
  },
};
