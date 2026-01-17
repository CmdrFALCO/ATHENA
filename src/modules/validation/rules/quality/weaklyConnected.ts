import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Weakly Connected Rule
 *
 * Detects notes with exactly 1 connection.
 * These notes might benefit from more integration into the knowledge graph.
 */
export const weaklyConnectedRule: ValidationRule = {
  id: 'weakly-connected',
  name: 'Weakly Connected Note',
  description:
    'Notes with only one connection may need more integration into the knowledge graph.',
  severity: 'warning',
  target: 'entity',
  appliesTo: ['note'],
  enabledByDefault: true,

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];

    for (const entity of ctx.entities) {
      if (entity.type !== 'note') continue;

      const outgoing = ctx.connectionsBySource.get(entity.id) || [];
      const incoming = ctx.connectionsByTarget.get(entity.id) || [];
      const totalConnections = outgoing.length + incoming.length;

      if (totalConnections === 1) {
        violations.push({
          id: `weakly-connected-${entity.id}`,
          ruleId: 'weakly-connected',
          severity: 'warning',
          focusType: 'entity',
          focusId: entity.id,
          message: `Note "${entity.title || 'Untitled'}" has only one connection.`,
          suggestion: {
            type: 'manual',
            description:
              'Consider adding more connections to integrate this note better. Check the Similar Notes panel for suggestions.',
            autoApplicable: false,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return violations;
  },
};
