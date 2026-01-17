import type { ValidationRule, ValidationContext } from '../../types';
import type { Violation } from '../../types/violations';

/**
 * Stale Suggestion Rule
 *
 * Detects AI-suggested connections that have been pending for too long.
 * Default threshold: 7 days.
 *
 * Note: This rule operates on ephemeral SuggestedConnections from the
 * application state, not persisted Connection records.
 */
export const staleSuggestionRule: ValidationRule = {
  id: 'stale-suggestion',
  name: 'Stale AI Suggestion',
  description:
    'AI-suggested connections should be reviewed within a reasonable timeframe.',
  severity: 'warning',
  target: 'connection',
  enabledByDefault: true,

  evaluate: (ctx: ValidationContext): Violation[] => {
    const violations: Violation[] = [];

    // Skip if no suggested connections provided
    if (!ctx.suggestedConnections || ctx.suggestedConnections.length === 0) {
      return violations;
    }

    const STALE_THRESHOLD_DAYS = 7;
    const now = new Date();

    for (const suggestion of ctx.suggestedConnections) {
      // Only check pending suggestions (not dismissed ones)
      if (suggestion.status !== 'pending') continue;

      const generatedAt = new Date(suggestion.generatedAt);
      const daysSinceGenerated =
        (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceGenerated > STALE_THRESHOLD_DAYS) {
        const sourceEntity = ctx.entityById.get(suggestion.sourceId);
        const targetEntity = ctx.entityById.get(suggestion.targetId);

        violations.push({
          id: `stale-suggestion-${suggestion.id}`,
          ruleId: 'stale-suggestion',
          severity: 'warning',
          focusType: 'connection',
          focusId: suggestion.id,
          message: `AI suggestion between "${sourceEntity?.title || suggestion.sourceId}" and "${targetEntity?.title || suggestion.targetId}" has been pending for ${Math.floor(daysSinceGenerated)} days.`,
          suggestion: {
            type: 'manual',
            description: 'Accept or dismiss this AI-suggested connection.',
            autoApplicable: false,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return violations;
  },
};
