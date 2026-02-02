/**
 * AXIOM event type definitions
 *
 * Events are emitted by the engine for every significant state change,
 * enabling logging, state updates, and persistence (Principle 2: Transparency).
 *
 * @module axiom/events/types
 */

export type AXIOMEventType =
  | 'token:created'
  | 'token:moved'
  | 'token:updated'
  | 'token:deleted'
  | 'transition:enabled'
  | 'transition:fired'
  | 'transition:blocked'
  | 'engine:started'
  | 'engine:paused'
  | 'engine:resumed'
  | 'engine:stopped'
  | 'engine:step'
  | 'engine:maxSteps'
  | 'workflow:completed'
  | 'workflow:failed';

/**
 * AXIOMEvent — A typed event emitted by the engine
 */
export interface AXIOMEvent<T = unknown> {
  type: AXIOMEventType;
  timestamp: string;
  data: T;
}

// --- Specific event data types ---

export interface TokenCreatedEventData {
  tokenId: string;
  correlationId: string;
  color: string;
  placeId: string;
}

export interface TokenMovedEventData {
  tokenId: string;
  fromPlace: string;
  toPlace: string;
  transitionId: string;
}

export interface TokenUpdatedEventData {
  tokenId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TokenDeletedEventData {
  tokenId: string;
  fromPlace: string;
  reason: string;
}

export interface TransitionEnabledEventData {
  transitionId: string;
  inputPlaceIds: string[];
}

export interface TransitionFiredEventData {
  transitionId: string;
  inputTokenIds: string[];
  outputTokenIds: string[];
  reason: string;
  durationMs: number;
}

export interface TransitionBlockedEventData {
  transitionId: string;
  failedGuards: string[];
}

export interface EngineStepEventData {
  stepNumber: number;
  transitionFired: string | null;
  enabledTransitions: string[];
}

export interface EngineMaxStepsEventData {
  maxSteps: number;
  stepCount: number;
}

export interface WorkflowCompletedEventData {
  workflowId: string;
  totalSteps: number;
  totalRetries: number;
  durationMs: number;
}

export interface WorkflowFailedEventData {
  workflowId: string;
  reason: string;
  lastError?: string;
}
