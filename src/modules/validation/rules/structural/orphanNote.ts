import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Orphan Note Rule
 *
 * Detects notes that have no connections AND are not part of any cluster.
 * These notes are "islands" in the knowledge graph.
 */
export const orphanNoteRule: ValidationRule = {
  id: 'orphan-note',
  name: 'Orphan Note',
  description:
    'Notes should be connected to at least one other entity or belong to a cluster.',
  severity: 'error',
  target: 'entity',
  appliesTo: ['note'],
  enabledByDefault: true,

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];

    for (const entity of ctx.entities) {
      // Only check notes (skip other entity types if any)
      if (entity.type !== 'note') continue;

      const outgoing = ctx.connectionsBySource.get(entity.id) || [];
      const incoming = ctx.connectionsByTarget.get(entity.id) || [];
      const clusters = ctx.clustersByEntity.get(entity.id) || [];

      const totalConnections = outgoing.length + incoming.length;

      // Orphan = no connections AND not in any cluster
      if (totalConnections === 0 && clusters.length === 0) {
        violations.push({
          id: `orphan-note-${entity.id}`,
          ruleId: 'orphan-note',
          severity: 'error',
          focusType: 'entity',
          focusId: entity.id,
          message: `Note "${entity.title || 'Untitled'}" has no connections and is not part of any cluster.`,
          suggestion: {
            type: 'manual',
            description:
              'Create a connection to another note, or add this note to a cluster.',
            autoApplicable: false,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return violations;
  },
};
