/**
 * Multi-Factor Confidence Calculator — WP 9B.3
 *
 * Replaces SimpleConfidenceCalculator from WP 9B.2.
 * Evaluates 8 distinct factors with weighted scoring,
 * floor veto, and human-readable explanations.
 */

import type {
  ConfidenceFactors,
  ConfidenceWeights,
  ConfidenceFloors,
  ConfidenceResult,
  ConfidenceExplanation,
} from './types';

/** Factor display labels */
const FACTOR_LABELS: Record<keyof ConfidenceFactors, string> = {
  sourceQuality: 'Source Quality',
  extractionClarity: 'Extraction Clarity',
  graphCoherence: 'Graph Coherence',
  embeddingSimilarity: 'Semantic Similarity',
  noveltyScore: 'Novelty',
  validationScore: 'Validation',
  critiqueSurvival: 'Critique Survival',
  invarianceScore: 'Structural Invariance',
};

/** Explanation templates for low-scoring factors */
const LOW_SCORE_EXPLANATIONS: Record<keyof ConfidenceFactors, string> = {
  sourceQuality: 'Source domain is not in trusted list',
  extractionClarity: 'AI extraction had low confidence in content structure',
  graphCoherence: 'Proposed connection has no shared context in existing graph',
  embeddingSimilarity: 'Weak semantic relationship between connected entities',
  noveltyScore: 'Very similar content already exists',
  validationScore: 'Some validation rules failed',
  critiqueSurvival: 'Proposal did not survive critique well',
  invarianceScore: 'Structural invariance check raised concerns',
};

/** Explanation templates for high-scoring factors */
const HIGH_SCORE_EXPLANATIONS: Record<keyof ConfidenceFactors, string> = {
  sourceQuality: 'Source is from a trusted domain',
  extractionClarity: 'AI extraction was highly confident',
  graphCoherence: 'Strong connection to existing knowledge patterns',
  embeddingSimilarity: 'Strong semantic relationship detected',
  noveltyScore: 'Content is novel and unique',
  validationScore: 'All validation rules passed',
  critiqueSurvival: 'Proposal survived adversarial critique',
  invarianceScore: 'Structural invariance verified',
};

export class MultiFactorConfidenceCalculator {
  constructor(
    private weights: ConfidenceWeights,
    private floors: ConfidenceFloors,
  ) {}

  /**
   * Calculate overall confidence score from factors.
   * Null factors (e.g., invarianceScore) are excluded and weights renormalized.
   */
  calculate(factors: ConfidenceFactors): ConfidenceResult {
    // 1. Determine which factors are active (non-null)
    const activeFactors = this.getActiveFactors(factors);

    // 2. Normalize weights to sum to 1.0 for active factors only
    const normalizedWeights = this.normalizeWeights(activeFactors);

    // 3. Compute weighted sum
    let score = 0;
    for (const factor of activeFactors) {
      const weight = normalizedWeights[factor] ?? 0;
      score += factors[factor]! * weight;
    }
    score = Math.min(1, Math.max(0, score));

    // 4. Check floor veto
    const vetoFactors = this.checkFloorVetos(factors, activeFactors);
    const hasFloorVeto = vetoFactors.length > 0;

    // 5. Generate explanations
    const explanations = this.explain(factors, vetoFactors);

    return {
      score,
      factors,
      explanations,
      hasFloorVeto,
      vetoFactors,
      weightsUsed: normalizedWeights,
    };
  }

  /**
   * Generate human-readable explanations for notable factors.
   * Only generates explanations for:
   * - Below floor (critical + veto)
   * - Below 0.4 (warning)
   * - Above 0.9 (positive signal)
   * - Null factors (not tested)
   */
  explain(
    factors: ConfidenceFactors,
    vetoFactors: (keyof ConfidenceFactors)[] = [],
  ): ConfidenceExplanation[] {
    const explanations: ConfidenceExplanation[] = [];
    const allKeys = Object.keys(FACTOR_LABELS) as (keyof ConfidenceFactors)[];

    for (const factor of allKeys) {
      const value = factors[factor];

      // Handle null (invarianceScore stub)
      if (value === null) {
        explanations.push({
          factor,
          score: 0,
          label: FACTOR_LABELS[factor],
          explanation: 'Not yet tested',
          severity: 'ok',
          isFloorVeto: false,
        });
        continue;
      }

      const isVeto = vetoFactors.includes(factor);

      // Floor veto (critical)
      if (isVeto) {
        explanations.push({
          factor,
          score: value,
          label: FACTOR_LABELS[factor],
          explanation: `${LOW_SCORE_EXPLANATIONS[factor]} (below minimum threshold)`,
          severity: 'critical',
          isFloorVeto: true,
        });
        continue;
      }

      // Warning (below 0.4)
      if (value < 0.4) {
        explanations.push({
          factor,
          score: value,
          label: FACTOR_LABELS[factor],
          explanation: LOW_SCORE_EXPLANATIONS[factor],
          severity: 'warning',
          isFloorVeto: false,
        });
        continue;
      }

      // Positive signal (above 0.9)
      if (value > 0.9) {
        explanations.push({
          factor,
          score: value,
          label: FACTOR_LABELS[factor],
          explanation: HIGH_SCORE_EXPLANATIONS[factor],
          severity: 'ok',
          isFloorVeto: false,
        });
      }
    }

    return explanations;
  }

  /**
   * Update weights (e.g., when DevSettings change).
   */
  updateWeights(weights: ConfidenceWeights): void {
    this.weights = weights;
  }

  /**
   * Update floors (e.g., when DevSettings change).
   */
  updateFloors(floors: ConfidenceFloors): void {
    this.floors = floors;
  }

  // --- Private helpers ---

  /** Get list of factors that have non-null values */
  private getActiveFactors(
    factors: ConfidenceFactors,
  ): (keyof ConfidenceWeights)[] {
    const weightedFactors = Object.keys(this.weights) as (keyof ConfidenceWeights)[];
    return weightedFactors.filter(
      (f) => factors[f] !== null && factors[f] !== undefined,
    );
  }

  /** Normalize weights for active factors to sum to 1.0 */
  private normalizeWeights(
    activeFactors: (keyof ConfidenceWeights)[],
  ): Partial<Record<keyof ConfidenceFactors, number>> {
    let totalWeight = 0;
    for (const factor of activeFactors) {
      totalWeight += this.weights[factor];
    }

    const normalized: Partial<Record<keyof ConfidenceFactors, number>> = {};
    if (totalWeight === 0) {
      // Avoid division by zero — equal weights
      for (const factor of activeFactors) {
        normalized[factor] = 1 / activeFactors.length;
      }
    } else {
      for (const factor of activeFactors) {
        normalized[factor] = this.weights[factor] / totalWeight;
      }
    }

    return normalized;
  }

  /** Check which active factors fall below their floor values */
  private checkFloorVetos(
    factors: ConfidenceFactors,
    activeFactors: (keyof ConfidenceWeights)[],
  ): (keyof ConfidenceFactors)[] {
    const vetoed: (keyof ConfidenceFactors)[] = [];

    for (const factor of activeFactors) {
      const value = factors[factor];
      const floor = this.floors[factor];

      // Skip if no floor set (floor = 0)
      if (floor <= 0) continue;

      if (typeof value === 'number' && value < floor) {
        vetoed.push(factor);
      }
    }

    return vetoed;
  }
}
