/**
 * Autonomous Mode — Barrel Export (WP 9B.2 + 9B.3)
 *
 * AI auto-commit with deferred human oversight:
 * confidence gates, provenance tracking, rate limiting, and revert capability.
 * WP 9B.3: Multi-factor confidence scoring with weighted factors, floor veto, and dynamic thresholds.
 */

// Types
export type {
  AutonomousConfig,
  AutonomousPreset,
  AutoCommitProvenance,
  AutonomousDecision,
  ConfidenceSnapshot,
  ReviewStatus,
  RevertSnapshot,
  ProvenanceSource,
  IProvenanceAdapter,
} from './types';

// Presets
export { AUTONOMOUS_PRESETS, getPresetConfig } from './presets';

// Adapter
export { ProvenanceAdapter } from './ProvenanceAdapter';

// Services
export { RateLimiter } from './RateLimiter';
export { SimpleConfidenceCalculator } from './ConfidenceCalculator';
export { AutonomousCommitService } from './AutonomousCommitService';

// State
export { autonomousState$, autonomousActions } from './autonomousState';
export type { AutonomousState } from './autonomousState';

// Components
export { AutoCommitToastContainer } from './AutoCommitToast';

// WP 9B.3: Multi-Factor Confidence Scoring
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
  IGraphCoherenceStrategy,
  IThresholdAdjuster,
  NoveltyResult,
} from './confidence';

export {
  SourceTrustEvaluator,
  EmbeddingSimilarityEvaluator,
  NoveltyDetector,
  NeighborhoodCoherenceStrategy,
  MultiFactorConfidenceCalculator,
  StaticThresholds,
  GlobalRatioAdjuster,
} from './confidence';
