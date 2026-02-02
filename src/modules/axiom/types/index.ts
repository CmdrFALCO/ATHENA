/**
 * AXIOM type definitions barrel export
 *
 * @module axiom/types
 */

// Color sets
export type { PROPOSAL, VALIDATION_RESULT, FEEDBACK, TokenColor } from './colorSets';
export { SINK_COLORS, ACTIVE_COLORS } from './colorSets';

// Token
export type { AetherToken, TokenMetadata, TransitionRecord, ValidationRecord } from './token';
export { createToken } from './token';

// Place
export type { PlaceConfig, PlaceState } from './place';

// Transition
export type {
  GuardFunction,
  ActionFunction,
  NamedGuard,
  TransitionConfig,
  TransitionContext,
} from './transition';

// Feedback
export type { CorrectionFeedback } from './feedback';
export { formatFeedbackForLLM } from './feedback';
