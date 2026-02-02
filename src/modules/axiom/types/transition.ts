/**
 * Transition type definitions for the CPN
 *
 * Transitions move tokens between places. Each transition has guards
 * (synchronous predicates) and an action (possibly async transformation).
 *
 * @module axiom/types/transition
 */

import type { AetherToken } from './token';

// Forward reference to avoid circular import — AXIOMEngine is referenced by type only
export interface TransitionContext {
  /** Reference to the engine (for querying state in actions) */
  engine: unknown; // AXIOMEngine — typed as unknown to avoid circular imports
  /** Current timestamp */
  timestamp: string;
  /** Current engine step number */
  stepNumber: number;
}

/**
 * GuardFunction — MUST be synchronous
 *
 * TypeScript enforces this: return type is `boolean`, not `Promise<boolean>`.
 * If you need async data, pre-fetch in the action and store the result
 * in token metadata. Guards then check the stored result.
 */
export type GuardFunction<T = unknown> = (
  tokens: AetherToken<T>[],
  context?: TransitionContext,
) => boolean;

/**
 * ActionFunction — CAN be async
 *
 * Transforms input tokens into output tokens.
 * Returns an array of tokens to deposit in output places.
 */
export type ActionFunction<TIn = unknown, TOut = unknown> = (
  tokens: AetherToken<TIn>[],
  context?: TransitionContext,
) => Promise<AetherToken<TOut>[]> | AetherToken<TOut>[];

/**
 * Named guard — a guard with an ID for audit logging
 */
export interface NamedGuard<T = unknown> {
  id: string;
  name: string;
  fn: GuardFunction<T>;
}

/**
 * TransitionConfig — Static configuration for a CPN transition
 */
export interface TransitionConfig<TIn = unknown, TOut = unknown> {
  /** Unique transition identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description */
  description?: string;

  /** Input place IDs (all must have tokens for transition to be enabled) */
  inputPlaces: string[];

  /** Output place IDs (where tokens go after firing) */
  outputPlaces: string[];

  /** Guards — all must pass for transition to fire */
  guards: NamedGuard<TIn>[];

  /** Action — transforms input tokens into output tokens */
  action: ActionFunction<TIn, TOut>;

  /** Priority — higher fires first when multiple transitions are enabled */
  priority?: number;
}
