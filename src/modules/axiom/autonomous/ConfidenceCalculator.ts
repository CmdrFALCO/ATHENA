/**
 * Simple Confidence Calculator — WP 9B.2
 *
 * Weighted aggregate scoring for autonomous commit decisions.
 * WP 9B.3 will replace this with multi-factor scoring including
 * source trust, graph coherence, embedding similarity, and novelty detection.
 */

import type { ConfidenceSnapshot } from './types';

const WEIGHTS = {
  proposalConfidence: 0.35,
  validationScore: 0.25,
  critiqueSurvival: 0.25,
  noveltyScore: 0.15,
} as const;

export class SimpleConfidenceCalculator {
  /**
   * Calculate aggregate confidence for an autonomous commit decision.
   *
   * Factors:
   * - proposalConfidence: max confidence across NodeProposal/EdgeProposal items
   * - validationScore: 1.0 if all rules passed, 0.0 if errors
   * - critiqueSurvival: survival score from Devil's Advocate (if run)
   * - noveltyScore: 1.0 if not a near-duplicate (placeholder for WP 9B.3)
   */
  calculate(factors: ConfidenceSnapshot): number {
    let score = 0;
    let totalWeight = 0;

    // Always include these
    score += factors.proposalConfidence * WEIGHTS.proposalConfidence;
    totalWeight += WEIGHTS.proposalConfidence;

    score += factors.validationScore * WEIGHTS.validationScore;
    totalWeight += WEIGHTS.validationScore;

    score += factors.noveltyScore * WEIGHTS.noveltyScore;
    totalWeight += WEIGHTS.noveltyScore;

    // Only include critique if it ran
    if (factors.critiqueSurvival !== null) {
      score += factors.critiqueSurvival * WEIGHTS.critiqueSurvival;
      totalWeight += WEIGHTS.critiqueSurvival;
    }

    // Normalize by actual weight used
    return Math.min(1, Math.max(0, score / totalWeight));
  }

  /**
   * Generate human-readable explanations for confidence factors.
   */
  explain(factors: ConfidenceSnapshot): string[] {
    const explanations: string[] = [];

    if (factors.proposalConfidence < 0.5)
      explanations.push('Low AI proposal confidence');
    if (factors.validationScore < 1.0)
      explanations.push('Validation warnings present');
    if (factors.critiqueSurvival !== null && factors.critiqueSurvival < 0.5)
      explanations.push('Critique raised significant concerns');
    if (factors.noveltyScore < 0.3)
      explanations.push('May be duplicate of existing content');

    if (explanations.length === 0)
      explanations.push('All confidence factors strong');

    return explanations;
  }
}
