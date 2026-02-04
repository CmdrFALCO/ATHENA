/**
 * Autonomous Mode — Barrel Export (WP 9B.2 + 9B.3 + 9B.4)
 *
 * AI auto-commit with deferred human oversight:
 * confidence gates, provenance tracking, rate limiting, and revert capability.
 * WP 9B.3: Multi-factor confidence scoring with weighted factors, floor veto, and dynamic thresholds.
 * WP 9B.4: Human review queue for deferred oversight.
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

// WP 9B.4: Review Queue
export type {
  ReviewQueueItem,
  ReviewStats,
  ReviewSortField,
  ReviewFilterReason,
  ReviewQueueConfig,
} from './review';

export {
  ReviewActions,
  reviewState$,
  reviewActions,
} from './review';
export type {
  ReviewQueueState,
  ReviewActiveTab,
} from './review';

// WP 9B.5: Structural Invariance
export type {
  RobustnessLabel,
  CompressionInterpretation,
  ParaphraseResult,
  CompressionResult,
  CompressionBreakdownPoint,
  InvarianceEvidence,
  InvarianceConfig,
  IInvarianceAdapter,
} from './invariance';

export {
  ParaphraseStabilityTest,
  CompressionSurvivalTest,
  InvarianceService,
  SQLiteInvarianceAdapter,
} from './invariance';
