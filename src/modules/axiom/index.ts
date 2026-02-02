/**
 * AXIOM — Automated eXpert for Industrial Output Management
 *
 * Three-layer neuro-symbolic architecture for knowledge graph validation:
 * 1. Der Generator (Layer 1) — LLM produces proposals (Phase 7 AI Chat)
 * 2. Der Validator (Layer 2) — Rules check constraints (Phase 5A Validation)
 * 3. Der Supervisor (Layer 3) — CPN orchestrates the loop (this module)
 *
 * The key innovation: corrective feedback loop — validation errors flow back
 * to the LLM as structured guidance for regeneration, not just rejection.
 *
 * @module axiom
 */

// Types
export type {
  PROPOSAL,
  VALIDATION_RESULT,
  FEEDBACK,
  TokenColor,
  AetherToken,
  TokenMetadata,
  TransitionRecord,
  ValidationRecord,
  PlaceConfig,
  PlaceState,
  GuardFunction,
  ActionFunction,
  NamedGuard,
  TransitionConfig,
  TransitionContext,
  CorrectionFeedback,
} from './types';

export { createToken, formatFeedbackForLLM, SINK_COLORS, ACTIVE_COLORS } from './types';

// Engine
export { Place, Transition, AXIOMEngine, FeedbackBuilder, mapFixTypeToAction } from './engine';
export type { AXIOMEngineOptions, EngineState, EngineStats } from './engine';

// Stores
export type { ITokenStore, TokenFilter } from './stores';
export { InMemoryTokenStore, IndexedDBTokenStore } from './stores';

// Guards — helpers + termination
export { hasMinTokens, hasColor, allOf, anyOf, not } from './guards';
export { canRetry, shouldEscalate, maxStepsReached } from './guards';

// Guards — validation workflow
export {
  isValid,
  hasErrors,
  hasWarningsOnly,
  tokenCanRetry,
  tokenShouldEscalate,
  allLevelsPassed,
  levelPassed,
} from './guards';

// Guards — schema (Level 1)
export { nodesHaveRequiredFields, edgesHaveRequiredFields, schemaValid } from './guards';

// Guards — constraints (Level 2)
export { noSelfLoops, noDuplicateEdges, referencedNodesExist } from './guards';

// Guards — semantic (Level 3 stubs)
export { semanticallyRelevant, contentCoherent, notDuplicate } from './guards';

// Events
export { AXIOMEventBridge } from './events';
export type {
  AXIOMEventType,
  AXIOMEvent,
  AXIOMEventBridgeOptions,
  TokenCreatedEventData,
  TokenMovedEventData,
  TransitionFiredEventData,
  WorkflowCompletedEventData,
  WorkflowFailedEventData,
} from './events';

// Store (Legend-State)
export { axiomState$, axiomActions } from './store';
export type { AXIOMState } from './store';

// Hooks (WP 9A.3)
export { useAXIOMPanel } from './hooks';

// Hooks (WP 9A.4)
export { useAXIOM } from './hooks';
export { useTokens, useTokenCount, useHasToken, useTotalTokenCount } from './hooks';
export { useWorkflowState } from './hooks';
export type { WorkflowPhase } from './hooks';

// Components (WP 9A.3)
export {
  AXIOMIndicator,
  AXIOMPanel,
  AXIOMControls,
  WorkflowGraph,
  TokenInspector,
  TransitionLog,
  FeedbackDisplay,
  InterventionModal,
} from './components';

// Workflows
export {
  PLACE_IDS,
  TRANSITION_IDS,
  VALIDATION_PLACES,
  ALL_PLACES,
  createValidationNet,
  wireValidationNet,
  createProposalToken,
  createPlaceholders,
  createAllTransitions,
} from './workflows';
export type {
  PlaceId,
  TransitionId,
  ValidatedPayload,
  ValidationPlaceholders,
  ValidationNetOptions,
  ValidationNetResult,
  WorkflowResult,
} from './workflows';

// Integration (WP 9A.4)
export {
  validateProposal,
  regenerateWithFeedback,
  commitToGraph,
  setGraphAdapters,
  hasGraphAdapters,
} from './integration';

// Services (WP 9A.4)
export { AXIOMValidationService, axiomValidationService } from './services/AXIOMValidationService';

// --- Debug Globals ---

import { devSettings$ } from '@/config/devSettings';
import { axiomState$ } from './store';
import { axiomActions } from './store';
import { AXIOMEngine } from './engine';
import { AXIOMEventBridge } from './events';
import { InMemoryTokenStore } from './stores/InMemoryTokenStore';
import { IndexedDBTokenStore } from './stores/IndexedDBTokenStore';
import type { PlaceId } from './workflows/types';
import type { PROPOSAL } from './types/colorSets';

/**
 * Create and configure the default AXIOM engine instance
 * based on current DevSettings.
 */
export function createDefaultEngine(): AXIOMEngine {
  const config = devSettings$.axiom.peek();

  const tokenStore = config.persistence.enabled
    ? new IndexedDBTokenStore()
    : new InMemoryTokenStore();

  const eventBridge = new AXIOMEventBridge({
    logToConsole: config.events.logToConsole,
    updateLegendState: config.events.updateLegendState,
    persistToHistory: config.events.persistToHistory,
    verbosity: config.events.verbosity,
  });

  const engine = new AXIOMEngine({
    tokenStore,
    eventBridge,
    maxSteps: config.workflow.maxSteps,
  });

  // Expose debug globals if enabled
  if (config.debug.exposeGlobals && typeof window !== 'undefined') {
    (window as Record<string, unknown>).__ATHENA_AXIOM__ = {
      // State inspection
      getState: () => axiomState$.peek(),
      getEngine: () => engine,
      getPlaces: () => engine.getPlaces(),
      getTokens: (placeId: string) => engine.getTokensInPlace(placeId),
      getEnabled: () => engine.getEnabledTransitions(),

      // Manual control
      step: () => engine.step(),
      run: () => engine.run(),
      pause: () => engine.pause(),
      resume: () => engine.resume(),

      // Token inspection
      findToken: (tokenId: string) => engine.findToken(tokenId),

      // Export
      exportState: () => JSON.stringify(axiomState$.peek(), null, 2),

      // WP 9A.4: Integration access
      processProposal: async (p: PROPOSAL) => {
        const { axiomValidationService } = await import('./services/AXIOMValidationService');
        return axiomValidationService.processProposal(p);
      },
      getService: async () => {
        const { axiomValidationService } = await import('./services/AXIOMValidationService');
        return axiomValidationService;
      },
    };

    // UI debug globals (WP 9A.3)
    (window as Record<string, unknown>).__ATHENA_AXIOM_UI__ = {
      openPanel: () => axiomActions.openPanel(),
      closePanel: () => axiomActions.closePanel(),
      togglePanel: () => axiomActions.togglePanel(),
      selectToken: (id: string) => axiomActions.selectToken(id),
      selectPlace: (id: PlaceId) => axiomActions.selectPlace(id),
      selectTab: (tab: 'graph' | 'tokens' | 'history') => axiomActions.selectTab(tab),
      getUIState: () => ({
        panelOpen: axiomState$.panelOpen.peek(),
        selectedTab: axiomState$.selectedTab.peek(),
        selectedTokenId: axiomState$.selectedTokenId.peek(),
        selectedPlaceId: axiomState$.selectedPlaceId.peek(),
        interventionPending: axiomState$.interventionPending.peek(),
      }),
    };
  }

  return engine;
}
