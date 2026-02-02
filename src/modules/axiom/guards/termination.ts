/**
 * Termination guards
 *
 * Guards that determine whether to retry, escalate, or terminate a workflow.
 *
 * @module axiom/guards/termination
 */

import type { AetherToken } from '../types/token';

/**
 * Can retry — retryCount is less than maxRetries.
 */
export function canRetry<T>(token: AetherToken<T>): boolean {
  return token.retryCount < token.maxRetries;
}

/**
 * Should escalate — retryCount has reached or exceeded maxRetries.
 */
export function shouldEscalate<T>(token: AetherToken<T>): boolean {
  return token.retryCount >= token.maxRetries;
}

/**
 * Max steps reached — safety limit for engine execution.
 */
export function maxStepsReached(
  stepCount: number,
  maxSteps: number,
): boolean {
  return stepCount >= maxSteps;
}
