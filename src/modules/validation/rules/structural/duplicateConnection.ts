import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Duplicate Connection Rule
 *
 * Detects when multiple connections exist between the same source->target pair.
 * The first connection is kept; subsequent duplicates are flagged.
 */
export const duplicateConnectionRule: ValidationRule = {
  id: 'duplicate-connection',
  name: 'Duplicate Connection',
  description:
    'Multiple connections between the same source and target are not allowed.',
  severity: 'error',
  target: 'connection',
  enabledByDefault: true,

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];
    const seen = new Map<string, string>(); // key -> first connection id

    for (const conn of ctx.connections) {
      const key = `${conn.source_id}->${conn.target_id}`;

      if (seen.has(key)) {
        const sourceEntity = ctx.entityById.get(conn.source_id);
        const targetEntity = ctx.entityById.get(conn.target_id);

        violations.push({
          id: `duplicate-connection-${conn.id}`,
          ruleId: 'duplicate-connection',
          severity: 'error',
          focusType: 'connection',
          focusId: conn.id,
          message: `Duplicate connection from "${sourceEntity?.title || conn.source_id}" to "${targetEntity?.title || conn.target_id}".`,
          suggestion: {
            type: 'delete_connection',
            description: 'Delete this duplicate connection.',
            params: { connectionId: conn.id },
            autoApplicable: true,
          },
          detectedAt: new Date().toISOString(),
        });
      } else {
        seen.set(key, conn.id);
      }
    }

    return violations;
  },
};
