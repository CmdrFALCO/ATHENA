/**
 * Critique workflow guards (WP 9B.1)
 *
 * Guard factory functions for the Devil's Advocate critique path.
 * All follow the closure pattern from guards/helpers.ts.
 *
 * @module axiom/guards/critique
 */

import type { GuardFunction } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { CritiqueTriggerConfig, CritiqueBehaviorConfig } from '../types/critique';

/**
 * shouldCritique — determines if a token should enter the critique path.
 *
 * IMPORTANT: PROPOSAL doesn't have a top-level `confidence` field.
 * Computes max confidence across nodes[].confidence and edges[].confidence.
 * If no confidence values exist, treats as 0 (won't trigger confidence threshold).
 *
 * Returns a guard function (closure pattern matching helpers.ts).
 */
export function shouldCritique(
  config: CritiqueTriggerConfig,
  critiqueEnabled: boolean,
): GuardFunction {
  return (tokens: AetherToken[]): boolean => {
    if (!critiqueEnabled) return false;
    if (tokens.length === 0) return false;

    const token = tokens[0];
    const proposal = token.payload as {
      nodes?: Array<{ confidence?: number; type?: string }>;
      edges?: Array<{ confidence?: number }>;
    };

    // Compute max confidence from individual node/edge proposals
    const nodeConfidences = (proposal.nodes ?? []).map((n) => n.confidence ?? 0);
    const edgeConfidences = (proposal.edges ?? []).map((e) => e.confidence ?? 0);
    const maxConfidence = Math.max(0, ...nodeConfidences, ...edgeConfidences);

    // Skip path: low confidence -> human review anyway
    if (maxConfidence < config.skipBelowConfidence) return false;

    // Trigger: high confidence — challenge assumptions when AI is "too sure"
    if (maxConfidence >= config.minConfidence) return true;

    // Trigger: structural significance (many connections)
    if ((proposal.edges?.length ?? 0) >= config.minConnections) return true;

    // Trigger: high-stakes entity types
    if (proposal.nodes?.some((n) => n.type != null && config.entityTypes.includes(n.type))) {
      return true;
    }

    // Trigger: probabilistic sampling (if enabled)
    if (config.probabilisticRate > 0 && Math.random() < config.probabilisticRate) {
      return true;
    }

    return false;
  };
}

/**
 * survived — post-critique guard: survivalScore >= survivalThreshold
 */
export function survived(config: CritiqueBehaviorConfig): GuardFunction {
  return (tokens: AetherToken[]): boolean => {
    if (tokens.length === 0) return false;
    const critiqueResult = tokens[0]._meta.critiqueResult;
    if (!critiqueResult) return false;
    return critiqueResult.survivalScore >= config.survivalThreshold;
  };
}

/**
 * reconsider — post-critique guard: between rejectThreshold and survivalThreshold
 */
export function reconsider(config: CritiqueBehaviorConfig): GuardFunction {
  return (tokens: AetherToken[]): boolean => {
    if (tokens.length === 0) return false;
    const critiqueResult = tokens[0]._meta.critiqueResult;
    if (!critiqueResult) return false;
    return (
      critiqueResult.survivalScore >= config.rejectThreshold &&
      critiqueResult.survivalScore < config.survivalThreshold
    );
  };
}

/**
 * critiqueRejected — post-critique guard: survivalScore < rejectThreshold
 */
export function critiqueRejected(config: CritiqueBehaviorConfig): GuardFunction {
  return (tokens: AetherToken[]): boolean => {
    if (tokens.length === 0) return false;
    const critiqueResult = tokens[0]._meta.critiqueResult;
    if (!critiqueResult) return false;
    return critiqueResult.survivalScore < config.rejectThreshold;
  };
}
