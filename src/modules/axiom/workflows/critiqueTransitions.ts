/**
 * CPN Transition definitions for the Critique Workflow (WP 9B.1)
 *
 * 5 transitions extending the validation workflow after P_verified:
 *
 * T_critique:         P_verified  → P_critiqued   (run Devil's Advocate agent)
 * T_skip_critique:    P_verified  → P_committed   (fast path when critique not needed)
 * T_critique_accept:  P_critiqued → P_committed   (survived critique)
 * T_critique_escalate:P_critiqued → P_escalated   (needs human review)
 * T_critique_reject:  P_critiqued → P_rejected    (failed critique)
 *
 * Priority ordering ensures deterministic routing:
 * T_critique(20) > T_skip_critique(15) for P_verified
 * T_critique_accept(20) > T_critique_escalate(15) > T_critique_reject(10) for P_critiqued
 *
 * @module axiom/workflows/critiqueTransitions
 */

import type { TransitionConfig } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { PROPOSAL } from '../types/colorSets';
import type { ValidationPlaceholders, ValidatedPayload } from './types';
import type { CritiqueTriggerConfig, CritiqueBehaviorConfig } from '../types/critique';
import type { DevilsAdvocateAgent } from '../agents/DevilsAdvocateAgent';
import { PLACE_IDS, TRANSITION_IDS } from './types';
import { hasMinTokens } from '../guards/helpers';
import {
  shouldCritique,
  survived,
  reconsider,
  critiqueRejected,
} from '../guards/critique';
import { not } from '../guards/helpers';

// ---------------------------------------------------------------------------
// T_critique — P_verified → P_critiqued
// ---------------------------------------------------------------------------

/**
 * Create T_critique: run Devil's Advocate agent against proposal.
 *
 * Guard: shouldCritique — triggers on high confidence, structural significance, etc.
 * Priority: 20 (beats T_skip_critique when shouldCritique is true).
 */
export function createT_critique(
  agent: DevilsAdvocateAgent,
  triggerConfig: CritiqueTriggerConfig,
  critiqueEnabled: boolean,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_critique,
    name: 'Critique',
    description: "Run Devil's Advocate agent",
    inputPlaces: [PLACE_IDS.P_verified],
    outputPlaces: [PLACE_IDS.P_critiqued],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'should_critique',
        name: 'Should critique',
        fn: shouldCritique(triggerConfig, critiqueEnabled),
      },
    ],
    action: async (tokens: AetherToken[]) => {
      const inputToken = tokens[0];

      const output = await agent.execute({ token: inputToken });
      const critiqueResult = output.result as import('../types/critique').CRITIQUE_RESULT;

      const outputToken: AetherToken = {
        ...inputToken,
        color: 'critiqued',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_critiqued,
          previousPlace: inputToken._meta.currentPlace,
          critiqueResult,
          critiqueDurationMs: critiqueResult.durationMs,
        },
      };

      return [outputToken];
    },
    priority: 20,
  };
}

// ---------------------------------------------------------------------------
// T_skip_critique — P_verified → P_committed (fast path)
// ---------------------------------------------------------------------------

/**
 * Create T_skip_critique: bypass critique and commit directly.
 *
 * Guard: NOT shouldCritique — fires when critique conditions are not met.
 * Priority: 15 (lower than T_critique — only fires if shouldCritique is false).
 */
export function createT_skip_critique(
  placeholders: ValidationPlaceholders,
  triggerConfig: CritiqueTriggerConfig,
  critiqueEnabled: boolean,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_skip_critique,
    name: 'Skip Critique',
    description: 'Bypass critique — commit directly',
    inputPlaces: [PLACE_IDS.P_verified],
    outputPlaces: [PLACE_IDS.P_committed],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'skip_critique',
        name: 'Skip critique',
        fn: not(shouldCritique(triggerConfig, critiqueEnabled)),
      },
    ],
    action: async (tokens: AetherToken[]) => {
      const inputToken = tokens[0];

      // Extract proposal for commit (strip validationResult if present)
      const payload = inputToken.payload as ValidatedPayload;
      const { validationResult: _vr, ...proposal } = payload;
      await placeholders.commitProposal(proposal as PROPOSAL);

      const outputToken: AetherToken = {
        ...inputToken,
        color: 'committed',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_committed,
          previousPlace: inputToken._meta.currentPlace,
          critiqueSkipped: true,
          critiqueSkipReason: 'trigger-conditions-not-met',
        },
      };

      return [outputToken];
    },
    priority: 15,
  };
}

// ---------------------------------------------------------------------------
// T_critique_accept — P_critiqued → P_committed
// ---------------------------------------------------------------------------

/**
 * Create T_critique_accept: proposal survived critique, commit to graph.
 *
 * Guard: survived — survivalScore >= survivalThreshold.
 * Before committing, adjusts node/edge confidences based on survival score.
 */
export function createT_critique_accept(
  placeholders: ValidationPlaceholders,
  behaviorConfig: CritiqueBehaviorConfig,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_critique_accept,
    name: 'Critique Accept',
    description: 'Survived critique — commit with adjusted confidence',
    inputPlaces: [PLACE_IDS.P_critiqued],
    outputPlaces: [PLACE_IDS.P_committed],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'survived',
        name: 'Survived critique',
        fn: survived(behaviorConfig),
      },
    ],
    action: async (tokens: AetherToken[]) => {
      const inputToken = tokens[0];
      const critiqueResult = inputToken._meta.critiqueResult;
      const payload = inputToken.payload as ValidatedPayload;

      // Extract proposal and adjust confidences based on survival score
      const { validationResult: _vr, ...proposal } = payload;
      const adjustedProposal = { ...proposal } as PROPOSAL;

      if (critiqueResult) {
        // Adjust individual node/edge confidences by survival score
        const survivalScore = critiqueResult.survivalScore;
        if (adjustedProposal.nodes) {
          adjustedProposal.nodes = adjustedProposal.nodes.map((n) => ({
            ...n,
            confidence: Math.round(n.confidence * survivalScore * 100) / 100,
          }));
        }
        if (adjustedProposal.edges) {
          adjustedProposal.edges = adjustedProposal.edges.map((e) => ({
            ...e,
            confidence: Math.round(e.confidence * survivalScore * 100) / 100,
          }));
        }
      }

      await placeholders.commitProposal(adjustedProposal);

      const outputToken: AetherToken = {
        ...inputToken,
        color: 'committed',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_committed,
          previousPlace: inputToken._meta.currentPlace,
        },
      };

      return [outputToken];
    },
    priority: 20,
  };
}

// ---------------------------------------------------------------------------
// T_critique_escalate — P_critiqued → P_escalated
// ---------------------------------------------------------------------------

/**
 * Create T_critique_escalate: critique raised concerns, escalate to human.
 *
 * Guard: reconsider — survivalScore between rejectThreshold and survivalThreshold.
 */
export function createT_critique_escalate(
  behaviorConfig: CritiqueBehaviorConfig,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_critique_escalate,
    name: 'Critique Escalate',
    description: 'Critique raised concerns — needs human decision',
    inputPlaces: [PLACE_IDS.P_critiqued],
    outputPlaces: [PLACE_IDS.P_escalated],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'reconsider',
        name: 'Reconsider',
        fn: reconsider(behaviorConfig),
      },
    ],
    action: (tokens: AetherToken[]) => {
      const inputToken = tokens[0];
      const outputToken: AetherToken = {
        ...inputToken,
        color: 'escalated',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_escalated,
          previousPlace: inputToken._meta.currentPlace,
        },
      };
      return [outputToken];
    },
    priority: 15,
  };
}

// ---------------------------------------------------------------------------
// T_critique_reject — P_critiqued → P_rejected
// ---------------------------------------------------------------------------

/**
 * Create T_critique_reject: critique found fatal issues, auto-reject.
 *
 * Guard: critiqueRejected — survivalScore < rejectThreshold.
 */
export function createT_critique_reject(
  behaviorConfig: CritiqueBehaviorConfig,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_critique_reject,
    name: 'Critique Reject',
    description: 'Critique rejected — survival score below threshold',
    inputPlaces: [PLACE_IDS.P_critiqued],
    outputPlaces: [PLACE_IDS.P_rejected],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'critique_rejected',
        name: 'Critique rejected',
        fn: critiqueRejected(behaviorConfig),
      },
    ],
    action: (tokens: AetherToken[]) => {
      const inputToken = tokens[0];
      const outputToken: AetherToken = {
        ...inputToken,
        color: 'rejected',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_rejected,
          previousPlace: inputToken._meta.currentPlace,
        },
      };
      return [outputToken];
    },
    priority: 10,
  };
}

// ---------------------------------------------------------------------------
// Factory: create all critique transitions
// ---------------------------------------------------------------------------

/**
 * Create all 5 critique transitions.
 */
export function createAllCritiqueTransitions(
  agent: DevilsAdvocateAgent,
  placeholders: ValidationPlaceholders,
  triggerConfig: CritiqueTriggerConfig,
  behaviorConfig: CritiqueBehaviorConfig,
  critiqueEnabled: boolean,
): TransitionConfig[] {
  return [
    createT_critique(agent, triggerConfig, critiqueEnabled),
    createT_skip_critique(placeholders, triggerConfig, critiqueEnabled),
    createT_critique_accept(placeholders, behaviorConfig),
    createT_critique_escalate(behaviorConfig),
    createT_critique_reject(behaviorConfig),
  ];
}
