/**
 * CPN Place definitions for the Validation Workflow
 *
 * 7 places following Jensen's CPN notation:
 * - 1 source (P_proposals)
 * - 2 sinks (P_committed, P_rejected)
 * - 4 intermediate (P_validating, P_deciding, P_verified, P_feedback)
 *
 * Token routing works via acceptedColors: a transition's action
 * sets the output token's color, and Transition.fire() deposits
 * into the first output place that accepts that color.
 *
 * @module axiom/workflows/places
 */

import type { PlaceConfig } from '../types/place';
import { PLACE_IDS } from './types';

/** Entry point — incoming proposals from Der Generator (LLM) */
export const P_proposals: PlaceConfig = {
  id: PLACE_IDS.P_proposals,
  name: 'Proposals',
  description: 'Incoming proposals from AI Chat (Der Generator)',
  isSource: true,
  acceptedColors: ['proposal'],
};

/** Reserved for future async validation (not currently wired) */
export const P_validating: PlaceConfig = {
  id: PLACE_IDS.P_validating,
  name: 'Validating',
  description: 'Under validation by Rules Engine (Der Validator)',
  acceptedColors: ['validating'],
};

/** Decision point: accept, retry, or reject */
export const P_deciding: PlaceConfig = {
  id: PLACE_IDS.P_deciding,
  name: 'Deciding',
  description: 'Decision point: accept, retry, or reject',
  acceptedColors: ['deciding'],
};

/** Passed all validation, awaiting commit */
export const P_verified: PlaceConfig = {
  id: PLACE_IDS.P_verified,
  name: 'Verified',
  description: 'Passed all validation, awaiting commit',
  acceptedColors: ['verified'],
};

/** Awaiting regeneration with corrective feedback */
export const P_feedback: PlaceConfig = {
  id: PLACE_IDS.P_feedback,
  name: 'Feedback',
  description: 'Awaiting regeneration with corrective feedback',
  acceptedColors: ['feedback'],
};

/** Terminal success — written to knowledge graph */
export const P_committed: PlaceConfig = {
  id: PLACE_IDS.P_committed,
  name: 'Committed',
  description: 'Written to knowledge graph (SUCCESS SINK)',
  isSink: true,
  acceptedColors: ['committed'],
};

/** Terminal failure — exceeded max retries or fatal error */
export const P_rejected: PlaceConfig = {
  id: PLACE_IDS.P_rejected,
  name: 'Rejected',
  description: 'Exceeded max retries or fatal error (FAILURE SINK)',
  isSink: true,
  acceptedColors: ['rejected'],
};

/** All validation places as a record keyed by place ID */
export const VALIDATION_PLACES: Record<string, PlaceConfig> = {
  [PLACE_IDS.P_proposals]: P_proposals,
  [PLACE_IDS.P_validating]: P_validating,
  [PLACE_IDS.P_deciding]: P_deciding,
  [PLACE_IDS.P_verified]: P_verified,
  [PLACE_IDS.P_feedback]: P_feedback,
  [PLACE_IDS.P_committed]: P_committed,
  [PLACE_IDS.P_rejected]: P_rejected,
};

/** All place configs in registration order */
export const ALL_PLACES: PlaceConfig[] = [
  P_proposals,
  P_validating,
  P_deciding,
  P_verified,
  P_feedback,
  P_committed,
  P_rejected,
];
