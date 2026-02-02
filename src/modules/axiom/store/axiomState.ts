/**
 * AXIOM Legend-State observable store
 *
 * Reactive state for the AXIOM engine, consumed by UI components.
 * Follows the pattern from validation/store/validationState.ts.
 *
 * @module axiom/store/axiomState
 */

import { observable } from '@legendapp/state';
import type { AXIOMEvent } from '../events/types';

export interface AXIOMState {
  // Engine state
  isRunning: boolean;
  isPaused: boolean;
  stepCount: number;

  // Current workflow
  activeWorkflowId: string | null;

  // Token state (summary, not full tokens — keeps observable lean)
  tokensByPlace: Record<string, string[]>;
  totalTokens: number;

  // Recent events (for UI display)
  recentEvents: AXIOMEvent[];

  // Aggregate stats
  stats: {
    totalWorkflowsRun: number;
    successfulWorkflows: number;
    failedWorkflows: number;
    averageRetries: number;
  };
}

export const axiomState$ = observable<AXIOMState>({
  isRunning: false,
  isPaused: false,
  stepCount: 0,
  activeWorkflowId: null,
  tokensByPlace: {},
  totalTokens: 0,
  recentEvents: [],
  stats: {
    totalWorkflowsRun: 0,
    successfulWorkflows: 0,
    failedWorkflows: 0,
    averageRetries: 0,
  },
});

// Expose for debugging (follows codebase pattern)
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_AXIOM_STATE__: typeof axiomState$ })
    .__ATHENA_AXIOM_STATE__ = axiomState$;
}
