/**
 * Place — Container for tokens in a CPN
 *
 * A Place holds zero or more tokens and enforces:
 * - Capacity limits (optional)
 * - Color validation (only accepted colors can enter)
 * - Sink semantics (terminal places accept tokens but don't allow removal)
 *
 * All token state is inspectable at any time (Principle 1: Minimal Abstraction).
 *
 * @module axiom/engine/Place
 */

import type { PlaceConfig, PlaceState } from '../types/place';
import type { AetherToken } from '../types/token';

export class Place<T = unknown> {
  private readonly config: PlaceConfig;
  private tokens: AetherToken<T>[] = [];

  constructor(config: PlaceConfig) {
    this.config = config;
  }

  /**
   * Push a token into this place.
   * Returns false if the place is at capacity or the token color is not accepted.
   */
  push(token: AetherToken<T>): boolean {
    if (!this.canAccept(token)) {
      return false;
    }
    this.tokens.push(token);
    return true;
  }

  /**
   * Non-destructive peek at tokens.
   * Returns a copy of the first `count` tokens (default: all).
   */
  pull(count?: number): AetherToken<T>[] {
    const n = count ?? this.tokens.length;
    return this.tokens.slice(0, n);
  }

  /**
   * Destructive removal of tokens.
   * Removes and returns the first `count` tokens (default: 1).
   *
   * Sink places do not allow removal.
   */
  take(count?: number): AetherToken<T>[] {
    if (this.config.isSink) {
      return [];
    }
    const n = count ?? 1;
    return this.tokens.splice(0, n);
  }

  /**
   * Remove all tokens from this place and return them.
   * Sink places do not allow removal.
   */
  clear(): AetherToken<T>[] {
    if (this.config.isSink) {
      return [];
    }
    const removed = this.tokens;
    this.tokens = [];
    return removed;
  }

  /** Current number of tokens in this place */
  get tokenCount(): number {
    return this.tokens.length;
  }

  /** Whether this place has no tokens */
  get isEmpty(): boolean {
    return this.tokens.length === 0;
  }

  /** Whether this place is at capacity */
  get isFull(): boolean {
    if (this.config.capacity === undefined) {
      return false;
    }
    return this.tokens.length >= this.config.capacity;
  }

  /** Snapshot of the current place state */
  get state(): PlaceState<T> {
    return {
      config: this.config,
      tokens: [...this.tokens],
      tokenCount: this.tokens.length,
    };
  }

  /** The place ID */
  get id(): string {
    return this.config.id;
  }

  /** Whether this is a sink (terminal) place */
  get isSink(): boolean {
    return this.config.isSink ?? false;
  }

  /** Whether this is a source (entry) place */
  get isSource(): boolean {
    return this.config.isSource ?? false;
  }

  /** The accepted token colors for this place */
  get acceptedColors(): readonly string[] {
    return this.config.acceptedColors;
  }

  /**
   * Check if a token can be accepted into this place.
   * Validates both capacity and color constraints.
   */
  canAccept(token: AetherToken<T>): boolean {
    // Check capacity
    if (this.isFull) {
      return false;
    }
    // Check color
    if (
      this.config.acceptedColors.length > 0 &&
      !this.config.acceptedColors.includes(token.color)
    ) {
      return false;
    }
    return true;
  }
}
