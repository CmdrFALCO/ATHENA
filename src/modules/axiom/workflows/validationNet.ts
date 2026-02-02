/**
 * ValidationNet — Factory to create and wire the validation workflow CPN
 *
 * Usage:
 *   const engine = createDefaultEngine();
 *   const net = createValidationNet({ maxRetries: 3 });
 *   wireValidationNet(engine, net);
 *   const token = createProposalToken(proposal);
 *   engine.addToken('P_proposals', token);
 *   await engine.run();
 *
 * @module axiom/workflows/validationNet
 */

import type { AXIOMEngine } from '../engine/AXIOMEngine';
import type { AetherToken } from '../types/token';
import type { PROPOSAL } from '../types/colorSets';
import { createToken } from '../types/token';
import { ALL_PLACES } from './places';
import { createAllTransitions } from './transitions';
import { createPlaceholders } from './placeholders';
import {
  PLACE_IDS,
  TRANSITION_IDS,
  type ValidationNetOptions,
  type ValidationNetResult,
} from './types';

/**
 * Create the validation net configuration (places + transitions).
 * Does not require an engine — returns configs that can be inspected/tested.
 */
export function createValidationNet(
  options?: ValidationNetOptions,
): ValidationNetResult {
  const placeholders = createPlaceholders(options?.placeholders);
  const transitionConfigs = createAllTransitions(placeholders);

  return {
    placeConfigs: ALL_PLACES,
    transitionConfigs,
    placeIds: PLACE_IDS,
    transitionIds: TRANSITION_IDS,
  };
}

/**
 * Wire the validation net into an engine instance.
 * Registers all places first (transitions reference them), then transitions.
 */
export function wireValidationNet(
  engine: AXIOMEngine,
  net: ValidationNetResult,
): void {
  // Register all places first (transitions validate place existence)
  for (const place of net.placeConfigs) {
    engine.addPlace(place);
  }
  // Register all transitions
  for (const transition of net.transitionConfigs) {
    engine.addTransition(transition);
  }
}

/**
 * Create a token for a new proposal, ready to deposit into P_proposals.
 */
export function createProposalToken(
  proposal: PROPOSAL,
  options?: { maxRetries?: number },
): AetherToken<PROPOSAL> {
  return createToken(proposal, {
    color: 'proposal',
    correlationId: proposal.correlationId,
    maxRetries: options?.maxRetries ?? 3,
    currentPlace: PLACE_IDS.P_proposals,
  });
}
