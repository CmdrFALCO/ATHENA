/**
 * CouncilNet — CPN workflow for the Multi-Agent Council
 * WP 9B.8
 *
 * Defines a linear workflow:
 *   P_council_query → T_generate → P_generated → T_critique → P_critiqued
 *   → T_synthesize → P_synthesized → T_emit → P_council_output
 *
 * Single pass, no retry loops. T_emit has a guard checking that
 * synthesized proposals are non-empty.
 *
 * Uses a SEPARATE AXIOMEngine instance from the validation net.
 */

import type { PlaceConfig } from '../types/place';
import type { TransitionConfig } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { AXIOMEngine } from '../engine/AXIOMEngine';
import { hasMinTokens } from '../guards/helpers';
import { createToken } from '../types/token';

// ============================================
// Place IDs
// ============================================

export const COUNCIL_PLACE_IDS = {
  P_council_query: 'P_council_query',
  P_generated: 'P_generated',
  P_critiqued: 'P_critiqued',
  P_synthesized: 'P_synthesized',
  P_council_output: 'P_council_output',
} as const;

// ============================================
// Transition IDs
// ============================================

export const COUNCIL_TRANSITION_IDS = {
  T_generate: 'T_generate',
  T_critique: 'T_critique',
  T_synthesize: 'T_synthesize',
  T_emit: 'T_emit',
} as const;

// ============================================
// Place Configs
// ============================================

export const COUNCIL_PLACES: PlaceConfig[] = [
  {
    id: COUNCIL_PLACE_IDS.P_council_query,
    name: 'Council Query',
    description: 'User query awaiting council processing',
    acceptedColors: ['council_query'],
    isSource: true,
  },
  {
    id: COUNCIL_PLACE_IDS.P_generated,
    name: 'Generated',
    description: 'Generator has produced proposals',
    acceptedColors: ['council_generated'],
  },
  {
    id: COUNCIL_PLACE_IDS.P_critiqued,
    name: 'Critiqued',
    description: 'Critic has evaluated proposals',
    acceptedColors: ['council_critiqued'],
  },
  {
    id: COUNCIL_PLACE_IDS.P_synthesized,
    name: 'Synthesized',
    description: 'Synthesizer has produced refined proposals',
    acceptedColors: ['council_synthesized'],
  },
  {
    id: COUNCIL_PLACE_IDS.P_council_output,
    name: 'Council Output',
    description: 'Final council output ready for chat pipeline',
    acceptedColors: ['council_output'],
    isSink: true,
  },
];

// ============================================
// Council Token Payload
// ============================================

export interface CouncilTokenPayload {
  query: string;
  context: string;
  contextNodeIds: string[];
  /** Raw generator response (filled after T_generate) */
  generatorResponse?: string;
  /** Raw critic response (filled after T_critique) */
  criticResponse?: string;
  /** Raw synthesizer response (filled after T_synthesize) */
  synthesizerResponse?: string;
  /** Whether synthesized proposals are non-empty */
  hasProposals?: boolean;
}

// ============================================
// Transition Configs
// ============================================

/**
 * T_generate: P_council_query → P_generated
 * Action is a placeholder — real agent call injected by CouncilService.
 */
function createT_generate(): TransitionConfig {
  return {
    id: COUNCIL_TRANSITION_IDS.T_generate,
    name: 'Generate',
    description: 'Generator agent produces proposals',
    inputPlaces: [COUNCIL_PLACE_IDS.P_council_query],
    outputPlaces: [COUNCIL_PLACE_IDS.P_generated],
    guards: [
      { id: 'has_tokens', name: 'Has input query', fn: hasMinTokens(1) },
    ],
    action: (tokens: AetherToken<CouncilTokenPayload>[]) => {
      // Placeholder — CouncilService replaces this with actual agent call
      return tokens.map((t) => ({
        ...t,
        color: 'council_generated' as const,
        _meta: { ...t._meta, currentPlace: COUNCIL_PLACE_IDS.P_generated },
      }));
    },
    priority: 10,
  };
}

/**
 * T_critique: P_generated → P_critiqued
 */
function createT_critique(): TransitionConfig {
  return {
    id: COUNCIL_TRANSITION_IDS.T_critique,
    name: 'Critique',
    description: 'Critic agent evaluates proposals',
    inputPlaces: [COUNCIL_PLACE_IDS.P_generated],
    outputPlaces: [COUNCIL_PLACE_IDS.P_critiqued],
    guards: [
      { id: 'has_tokens', name: 'Has generated proposals', fn: hasMinTokens(1) },
    ],
    action: (tokens: AetherToken<CouncilTokenPayload>[]) => {
      return tokens.map((t) => ({
        ...t,
        color: 'council_critiqued' as const,
        _meta: { ...t._meta, currentPlace: COUNCIL_PLACE_IDS.P_critiqued },
      }));
    },
    priority: 10,
  };
}

/**
 * T_synthesize: P_critiqued → P_synthesized
 */
function createT_synthesize(): TransitionConfig {
  return {
    id: COUNCIL_TRANSITION_IDS.T_synthesize,
    name: 'Synthesize',
    description: 'Synthesizer agent refines proposals',
    inputPlaces: [COUNCIL_PLACE_IDS.P_critiqued],
    outputPlaces: [COUNCIL_PLACE_IDS.P_synthesized],
    guards: [
      { id: 'has_tokens', name: 'Has critiqued proposals', fn: hasMinTokens(1) },
    ],
    action: (tokens: AetherToken<CouncilTokenPayload>[]) => {
      return tokens.map((t) => ({
        ...t,
        color: 'council_synthesized' as const,
        _meta: { ...t._meta, currentPlace: COUNCIL_PLACE_IDS.P_synthesized },
      }));
    },
    priority: 10,
  };
}

/**
 * T_emit: P_synthesized → P_council_output
 * Guard: hasProposals — checks that synthesized proposals are non-empty.
 */
function createT_emit(): TransitionConfig {
  return {
    id: COUNCIL_TRANSITION_IDS.T_emit,
    name: 'Emit',
    description: 'Emit final proposals if non-empty',
    inputPlaces: [COUNCIL_PLACE_IDS.P_synthesized],
    outputPlaces: [COUNCIL_PLACE_IDS.P_council_output],
    guards: [
      { id: 'has_tokens', name: 'Has synthesized output', fn: hasMinTokens(1) },
      {
        id: 'has_proposals',
        name: 'Synthesized proposals are non-empty',
        fn: (tokens: AetherToken<CouncilTokenPayload>[]): boolean => {
          return tokens[0]?.payload?.hasProposals === true;
        },
      },
    ],
    action: (tokens: AetherToken<CouncilTokenPayload>[]) => {
      return tokens.map((t) => ({
        ...t,
        color: 'council_output' as const,
        _meta: { ...t._meta, currentPlace: COUNCIL_PLACE_IDS.P_council_output },
      }));
    },
    priority: 10,
  };
}

// ============================================
// Factory & Wiring
// ============================================

export interface CouncilNetResult {
  placeConfigs: PlaceConfig[];
  transitionConfigs: TransitionConfig[];
}

/** Create the council net configuration. */
export function createCouncilNet(): CouncilNetResult {
  return {
    placeConfigs: [...COUNCIL_PLACES],
    transitionConfigs: [
      createT_generate(),
      createT_critique(),
      createT_synthesize(),
      createT_emit(),
    ],
  };
}

/** Wire the council net into an AXIOMEngine instance. */
export function wireCouncilNet(engine: AXIOMEngine, net: CouncilNetResult): void {
  for (const place of net.placeConfigs) {
    engine.addPlace(place);
  }
  for (const transition of net.transitionConfigs) {
    engine.addTransition(transition);
  }
}

/** Create a council token for the initial query. */
export function createCouncilToken(payload: CouncilTokenPayload): AetherToken<CouncilTokenPayload> {
  return createToken(payload, {
    color: 'council_query',
    correlationId: crypto.randomUUID(),
    maxRetries: 0, // No retries in council
    currentPlace: COUNCIL_PLACE_IDS.P_council_query,
  });
}
