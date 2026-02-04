/**
 * Autonomous Mode — Barrel Export (WP 9B.2)
 *
 * AI auto-commit with deferred human oversight:
 * confidence gates, provenance tracking, rate limiting, and revert capability.
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
