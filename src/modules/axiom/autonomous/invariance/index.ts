/**
 * Structural Invariance — Barrel Export (WP 9B.5)
 *
 * Paraphrase stability + compression survival tests
 * for verifying connection robustness.
 */

// Types
export type {
  RobustnessLabel,
  CompressionInterpretation,
  ParaphraseResult,
  CompressionResult,
  CompressionBreakdownPoint,
  InvarianceEvidence,
  InvarianceConfig,
  IInvarianceAdapter,
} from './types';

// Tests
export { ParaphraseStabilityTest } from './ParaphraseStabilityTest';
export { CompressionSurvivalTest } from './CompressionSurvivalTest';

// Service
export { InvarianceService } from './InvarianceService';

// Adapter
export { SQLiteInvarianceAdapter } from './SQLiteInvarianceAdapter';
