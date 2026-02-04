/**
 * Multi-Factor Confidence Scoring — WP 9B.3
 *
 * Barrel export for the confidence scoring subsystem.
 */

// Types
export type {
  SourceTrustLevel,
  ConfidenceFactors,
  ConfidenceExplanation,
  ConfidenceResult,
  ConfidenceWeights,
  ConfidenceFloors,
  SourceTrustConfig,
  DynamicAdjustmentConfig,
  ThresholdAdjustment,
  AdjustedThresholds,
  ConfidenceConfig,
} from './types';

// Evaluators
export { SourceTrustEvaluator } from './SourceTrustEvaluator';
export { EmbeddingSimilarityEvaluator } from './EmbeddingSimilarityEvaluator';
export { NoveltyDetector } from './NoveltyDetector';
export type { NoveltyResult } from './NoveltyDetector';

// Graph Coherence strategies
export type { IGraphCoherenceStrategy } from './IGraphCoherenceStrategy';
export { NeighborhoodCoherenceStrategy } from './NeighborhoodCoherenceStrategy';

// Calculator
export { MultiFactorConfidenceCalculator } from './MultiFactorConfidenceCalculator';

// Threshold adjustment strategies
export type { IThresholdAdjuster } from './IThresholdAdjuster';
export { StaticThresholds } from './StaticThresholds';
export { GlobalRatioAdjuster } from './GlobalRatioAdjuster';
