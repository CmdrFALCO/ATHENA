/**
 * CritiqueNet — Extends the validation net with Devil's Advocate critique (WP 9B.1)
 *
 * Replaces T_commit with the critique path:
 *   P_verified → T_critique → P_critiqued → T_critique_accept → P_committed
 *                                          → T_critique_escalate → P_escalated
 *                                          → T_critique_reject → P_rejected
 *             → T_skip_critique → P_committed (fast path)
 *
 * When critique is disabled, T_skip_critique always fires (backward compatible).
 *
 * @module axiom/workflows/critiqueNet
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { CritiqueTriggerConfig, CritiqueBehaviorConfig } from '../types/critique';
import type { ValidationNetResult, ValidationPlaceholders } from './types';
import { TRANSITION_IDS } from './types';
import { CRITIQUE_PLACES } from './critiquePlaces';
import { DevilsAdvocateAgent } from '../agents/DevilsAdvocateAgent';
import { createAllCritiqueTransitions } from './critiqueTransitions';
import { createPlaceholders } from './placeholders';

export interface CritiqueNetOptions {
  aiBackend: IAIBackend;
  triggerConfig: CritiqueTriggerConfig;
  behaviorConfig: CritiqueBehaviorConfig;
  critiqueEnabled: boolean;
}

/**
 * Extend a base validation net with the critique workflow.
 *
 * 1. Filters out T_commit from base transitions (replaced by critique path)
 * 2. Adds P_critiqued and P_escalated places
 * 3. Creates DevilsAdvocateAgent
 * 4. Adds all 5 critique transitions
 */
export function extendWithCritique(
  baseNet: ValidationNetResult,
  options: CritiqueNetOptions,
  placeholders?: Partial<ValidationPlaceholders>,
): ValidationNetResult {
  // 1. Filter out T_commit — replaced by T_skip_critique (fast path)
  //    and T_critique_accept (post-critique path)
  const filteredTransitions = baseNet.transitionConfigs.filter(
    (t) => t.id !== TRANSITION_IDS.T_commit,
  );

  // 2. Add critique places to place configs
  const extendedPlaces = [...baseNet.placeConfigs, ...CRITIQUE_PLACES];

  // 3. Create the agent
  const agent = new DevilsAdvocateAgent(options.aiBackend, options.behaviorConfig);

  // 4. Create all critique transitions using the same placeholders
  const resolvedPlaceholders = createPlaceholders(placeholders);
  const critiqueTransitions = createAllCritiqueTransitions(
    agent,
    resolvedPlaceholders,
    options.triggerConfig,
    options.behaviorConfig,
    options.critiqueEnabled,
  );

  return {
    placeConfigs: extendedPlaces,
    transitionConfigs: [...filteredTransitions, ...critiqueTransitions],
    placeIds: baseNet.placeIds,
    transitionIds: baseNet.transitionIds,
  };
}
