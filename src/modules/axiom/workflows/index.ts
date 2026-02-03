/**
 * AXIOM workflows barrel export
 *
 * @module axiom/workflows
 */

// Types
export type {
  PlaceId,
  TransitionId,
  ValidatedPayload,
  ValidationPlaceholders,
  ValidationNetOptions,
  ValidationNetResult,
  WorkflowResult,
} from './types';
export { PLACE_IDS, TRANSITION_IDS } from './types';

// Places
export {
  P_proposals,
  P_validating,
  P_deciding,
  P_verified,
  P_feedback,
  P_committed,
  P_rejected,
  VALIDATION_PLACES,
  ALL_PLACES,
} from './places';

// Transitions (factory functions for testing)
export {
  createT_validate,
  createT_accept,
  createT_prepare_retry,
  createT_regenerate,
  createT_reject,
  createT_commit,
  createAllTransitions,
} from './transitions';

// Placeholders
export { createPlaceholders } from './placeholders';

// Placeholders (real implementations)
export {
  realValidateProposal,
  realRegenerateProposal,
  realCommitProposal,
  createRealPlaceholders,
} from './placeholders';

// Factory
export {
  createValidationNet,
  wireValidationNet,
  createProposalToken,
} from './validationNet';

// WP 9B.1: Critique places
export { P_critiqued, P_escalated, CRITIQUE_PLACES } from './critiquePlaces';

// WP 9B.1: Critique transitions
export {
  createT_critique,
  createT_skip_critique,
  createT_critique_accept,
  createT_critique_escalate,
  createT_critique_reject,
  createAllCritiqueTransitions,
} from './critiqueTransitions';

// WP 9B.1: Critique net extension
export { extendWithCritique } from './critiqueNet';
export type { CritiqueNetOptions } from './critiqueNet';
