/**
 * Placeholder implementations for Phase 5A integration
 *
 * These stubs will be replaced with real implementations in WP 9A.4
 * when the validation workflow is integrated with ChatService and
 * the Phase 5A RulesEngine.
 *
 * @module axiom/workflows/placeholders
 */

import type { PROPOSAL, VALIDATION_RESULT } from '../types/colorSets';
import type { CorrectionFeedback } from '../types/feedback';
import type { ValidationPlaceholders } from './types';

/**
 * Placeholder: Validate proposal using Phase 5A.
 * Returns a valid result with no violations.
 * Will be replaced with actual RulesEngine call in WP 9A.4.
 */
async function defaultValidateProposal(
  proposal: PROPOSAL,
): Promise<VALIDATION_RESULT> {
  return {
    proposalId: proposal.id,
    valid: true,
    level1Passed: true,
    level2Passed: true,
    level3Passed: true,
    violations: [],
    validatedAt: new Date().toISOString(),
    durationMs: 0,
  };
}

/**
 * Placeholder: Regenerate proposal with corrective feedback.
 * Returns the same proposal with incremented attempt count.
 * Will be replaced with ChatService.regenerate() in WP 9A.4.
 */
async function defaultRegenerateProposal(
  proposal: PROPOSAL,
  feedback: CorrectionFeedback[],
): Promise<PROPOSAL> {
  return {
    ...proposal,
    attempt: proposal.attempt + 1,
    feedbackHistory: [...proposal.feedbackHistory, ...feedback],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Placeholder: Commit proposal to knowledge graph.
 * No-op — will be replaced with adapter calls in WP 9A.4.
 */
async function defaultCommitProposal(_proposal: PROPOSAL): Promise<void> {
  // No-op stub
}

/**
 * Create a full set of placeholders with defaults for any unspecified.
 * Pass partial overrides to inject real implementations for testing.
 */
export function createPlaceholders(
  overrides?: Partial<ValidationPlaceholders>,
): ValidationPlaceholders {
  return {
    validateProposal: overrides?.validateProposal ?? defaultValidateProposal,
    regenerateProposal:
      overrides?.regenerateProposal ?? defaultRegenerateProposal,
    commitProposal: overrides?.commitProposal ?? defaultCommitProposal,
  };
}

// Re-export real implementations for direct use (WP 9A.4)
export {
  validateProposal as realValidateProposal,
} from '../integration/validationIntegration';
export {
  regenerateWithFeedback as realRegenerateProposal,
} from '../integration/chatIntegration';
export {
  commitToGraph as realCommitProposal,
} from '../integration/graphIntegration';

/**
 * Create a full set of placeholders using real implementations.
 * WP 9A.4 — for production use when AXIOM is enabled.
 */
export async function createRealPlaceholders(): Promise<ValidationPlaceholders> {
  const { validateProposal } = await import('../integration/validationIntegration');
  const { regenerateWithFeedback } = await import('../integration/chatIntegration');
  const { commitToGraph } = await import('../integration/graphIntegration');

  return {
    validateProposal,
    regenerateProposal: regenerateWithFeedback,
    commitProposal: commitToGraph,
  };
}
