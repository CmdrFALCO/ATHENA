/**
 * Council module barrel export — WP 9B.8
 *
 * Multi-Agent Council: Generator → Critic → Synthesizer
 * orchestrated by a CPN net, producing pre-critiqued proposals.
 *
 * @module axiom/council
 */

// Types
export type {
  AgentRole,
  CritiqueAnnotation,
  CouncilEvent,
  CouncilSession,
  CouncilConfig,
  CouncilState,
} from './types';

// Agent types
export type {
  ICouncilAgent,
  AgentInput,
  AgentOutput,
} from './agents/types';

// Agents
export { GeneratorAgent } from './agents/GeneratorAgent';
export { CriticAgent } from './agents/CriticAgent';
export { SynthesizerAgent } from './agents/SynthesizerAgent';

// CPN Net
export {
  COUNCIL_PLACE_IDS,
  COUNCIL_TRANSITION_IDS,
  createCouncilNet,
  wireCouncilNet,
  createCouncilToken,
} from './CouncilNet';
export type { CouncilTokenPayload } from './CouncilNet';

// Service
export {
  CouncilService,
  initCouncilService,
  getCouncilService,
  isCouncilServiceReady,
} from './CouncilService';

// State
export { councilState$ } from './councilState';
export { councilActions } from './councilActions';

// Suggestion heuristic
export { shouldSuggestCouncil } from './CouncilSuggestion';
