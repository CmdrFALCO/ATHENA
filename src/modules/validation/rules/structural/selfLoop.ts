import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Self-Loop Rule
 *
 * Detects connections where source_id === target_id.
 * These are data integrity issues that shouldn't exist.
 */
export const selfLoopRule: ValidationRule = {
  id: 'self-loop',
  name: 'Self-Loop Connection',
  description: 'A note cannot have a connection to itself.',
  severity: 'error',
  target: 'connection',
  enabledByDefault: true,

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];

    for (const conn of ctx.connections) {
      if (conn.source_id === conn.target_id) {
        const entity = ctx.entityById.get(conn.source_id);

        violations.push({
          id: `self-loop-${conn.id}`,
          ruleId: 'self-loop',
          severity: 'error',
          focusType: 'connection',
          focusId: conn.id,
          message: `Connection creates a self-loop on "${entity?.title || conn.source_id}".`,
          suggestion: {
            type: 'delete_connection',
            description: 'Delete this self-referencing connection.',
            params: { connectionId: conn.id },
            autoApplicable: true,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return violations;
  },
};
