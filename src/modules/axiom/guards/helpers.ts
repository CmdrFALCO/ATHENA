/**
 * Guard composition helpers
 *
 * Utility functions for building guards from simple predicates.
 * Guards are always synchronous (TypeScript enforces this).
 *
 * @module axiom/guards/helpers
 */

import type { GuardFunction } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { TokenColor } from '../types/colorSets';

/**
 * Check that at least `min` tokens are available in the input.
 */
export function hasMinTokens(min: number): GuardFunction {
  return (tokens: AetherToken[]): boolean => tokens.length >= min;
}

/**
 * Check that the first token has a specific color.
 */
export function hasColor(color: TokenColor): GuardFunction {
  return (tokens: AetherToken[]): boolean =>
    tokens.length > 0 && tokens[0].color === color;
}

/**
 * Compose guards with AND — all must pass.
 */
export function allOf(...guards: GuardFunction[]): GuardFunction {
  return (tokens, context) => guards.every((g) => g(tokens, context));
}

/**
 * Compose guards with OR — at least one must pass.
 */
export function anyOf(...guards: GuardFunction[]): GuardFunction {
  return (tokens, context) => guards.some((g) => g(tokens, context));
}

/**
 * Negate a guard.
 */
export function not(guard: GuardFunction): GuardFunction {
  return (tokens, context) => !guard(tokens, context);
}
