/**
 * Transition — Firing logic with guards and actions
 *
 * A Transition connects input places to output places. It fires when:
 * 1. All input places have at least one token
 * 2. All guard functions return true (synchronous)
 *
 * When fired, the action function transforms input tokens into output tokens.
 * Every firing records a TransitionRecord with a mandatory reason (Principle 2).
 *
 * @module axiom/engine/Transition
 */

import type { TransitionConfig, TransitionContext } from '../types/transition';
import type { AetherToken, TransitionRecord } from '../types/token';
import type { Place } from './Place';

export class Transition<TIn = unknown, TOut = unknown> {
  private readonly config: TransitionConfig<TIn, TOut>;

  constructor(config: TransitionConfig<TIn, TOut>) {
    this.config = config;
  }

  /**
   * Check if this transition is enabled (can fire).
   *
   * A transition is enabled when:
   * - All input places have at least one token
   * - All guards pass on the available tokens
   */
  isEnabled(
    places: Map<string, Place<TIn>>,
    context: TransitionContext,
  ): boolean {
    // Check all input places have tokens
    for (const placeId of this.config.inputPlaces) {
      const place = places.get(placeId);
      if (!place || place.isEmpty) {
        return false;
      }
    }

    // Gather tokens from input places (peek, not take)
    const tokens = this.gatherInputTokens(places);

    // All guards must pass
    for (const guard of this.config.guards) {
      if (!guard.fn(tokens, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate all guards and return their individual results.
   * Useful for logging and debugging which guards passed/failed.
   */
  evaluateGuards(
    tokens: AetherToken<TIn>[],
    context: TransitionContext,
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    for (const guard of this.config.guards) {
      results[guard.id] = guard.fn(tokens, context);
    }
    return results;
  }

  /**
   * Fire the transition.
   *
   * 1. Takes tokens from input places
   * 2. Runs the action function to transform them
   * 3. Deposits output tokens into output places
   * 4. Records a TransitionRecord
   *
   * @param inputPlaces - Map of input place IDs to Place instances
   * @param outputPlaces - Map of output place IDs to Place instances
   * @param context - Runtime context
   * @param reason - REQUIRED: Why this transition is firing (Principle 2)
   */
  async fire(
    inputPlaces: Map<string, Place<TIn>>,
    outputPlaces: Map<string, Place<TOut>>,
    context: TransitionContext,
    reason: string,
  ): Promise<TransitionRecord> {
    const startTime = performance.now();

    // 1. Take tokens from input places
    const inputTokens: AetherToken<TIn>[] = [];
    for (const placeId of this.config.inputPlaces) {
      const place = inputPlaces.get(placeId);
      if (place) {
        const taken = place.take(1);
        inputTokens.push(...taken);
      }
    }

    // 2. Evaluate guards for the audit record
    const guardResults = this.evaluateGuards(inputTokens, context);

    // 3. Run the action
    const outputTokens = await this.config.action(inputTokens, context);

    // 4. Determine where tokens came from (for the record)
    const fromPlace =
      inputTokens.length > 0
        ? inputTokens[0]._meta.currentPlace
        : this.config.inputPlaces[0] ?? 'unknown';

    // 5. Deposit output tokens into output places
    const toPlace = this.config.outputPlaces[0] ?? 'unknown';
    for (const token of outputTokens) {
      // Try each output place in order until one accepts
      for (const placeId of this.config.outputPlaces) {
        const place = outputPlaces.get(placeId);
        if (place && place.canAccept(token as unknown as AetherToken<TOut>)) {
          // Update token metadata before depositing
          token._meta.previousPlace = token._meta.currentPlace;
          token._meta.currentPlace = placeId;
          place.push(token as unknown as AetherToken<TOut>);
          break;
        }
      }
    }

    const durationMs = performance.now() - startTime;

    // 6. Build transition record
    const record: TransitionRecord = {
      transitionId: this.config.id,
      firedAt: context.timestamp,
      fromPlace,
      toPlace,
      durationMs,
      guardResults,
      reason,
    };

    // 7. Append record to all output tokens' history
    for (const token of outputTokens) {
      token._meta.transitionHistory.push(record);
    }

    return record;
  }

  /** The transition ID */
  get id(): string {
    return this.config.id;
  }

  /** The transition priority (default 0) */
  get priority(): number {
    return this.config.priority ?? 0;
  }

  /** Input place IDs */
  get inputPlaceIds(): string[] {
    return [...this.config.inputPlaces];
  }

  /** Output place IDs */
  get outputPlaceIds(): string[] {
    return [...this.config.outputPlaces];
  }

  /** The transition name */
  get name(): string {
    return this.config.name;
  }

  /**
   * Gather tokens from input places without removing them (peek).
   */
  private gatherInputTokens(places: Map<string, Place<TIn>>): AetherToken<TIn>[] {
    const tokens: AetherToken<TIn>[] = [];
    for (const placeId of this.config.inputPlaces) {
      const place = places.get(placeId);
      if (place) {
        tokens.push(...place.pull(1));
      }
    }
    return tokens;
  }
}
