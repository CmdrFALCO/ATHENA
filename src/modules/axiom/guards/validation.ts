/**
 * Validation workflow guards
 *
 * Guards that operate on tokens carrying ValidatedPayload (PROPOSAL & { validationResult })
 * to determine workflow routing: accept, retry, or reject.
 *
 * All guards conform to GuardFunction signature:
 * (tokens: AetherToken[], context?) => boolean  (synchronous)
 *
 * @module axiom/guards/validation
 */

import type { AetherToken } from '../types/token';
import type { GuardFunction } from '../types/transition';
import type { ValidatedPayload } from '../workflows/types';
import { canRetry, shouldEscalate } from './termination';

/**
 * Check if validation passed (no error-level violations).
 */
export function isValid(
  tokens: AetherToken<ValidatedPayload>[],
): boolean {
  if (tokens.length === 0) return false;
  const result = tokens[0].payload.validationResult;
  return result.valid && result.violations.filter((v) => v.severity === 'error').length === 0;
}

/**
 * Check if validation has error-level violations.
 */
export function hasErrors(
  tokens: AetherToken<ValidatedPayload>[],
): boolean {
  if (tokens.length === 0) return false;
  const result = tokens[0].payload.validationResult;
  return result.violations.some((v) => v.severity === 'error');
}

/**
 * Check if validation has only warnings (no errors).
 */
export function hasWarningsOnly(
  tokens: AetherToken<ValidatedPayload>[],
): boolean {
  if (tokens.length === 0) return false;
  const result = tokens[0].payload.validationResult;
  return (
    result.violations.length > 0 &&
    result.violations.every((v) => v.severity === 'warning')
  );
}

/**
 * Check if token can retry — wraps single-token canRetry for array-based guard interface.
 */
export function tokenCanRetry(
  tokens: AetherToken[],
): boolean {
  if (tokens.length === 0) return false;
  return canRetry(tokens[0]);
}

/**
 * Check if token should be escalated/rejected — wraps shouldEscalate for array interface.
 */
export function tokenShouldEscalate(
  tokens: AetherToken[],
): boolean {
  if (tokens.length === 0) return false;
  return shouldEscalate(tokens[0]);
}

/**
 * Check all three validation levels passed.
 */
export function allLevelsPassed(
  tokens: AetherToken<ValidatedPayload>[],
): boolean {
  if (tokens.length === 0) return false;
  const result = tokens[0].payload.validationResult;
  return result.level1Passed && result.level2Passed && result.level3Passed;
}

/**
 * Check a specific validation level passed.
 */
export function levelPassed(
  level: 1 | 2 | 3,
): GuardFunction<ValidatedPayload> {
  return (tokens: AetherToken<ValidatedPayload>[]): boolean => {
    if (tokens.length === 0) return false;
    const result = tokens[0].payload.validationResult;
    switch (level) {
      case 1:
        return result.level1Passed;
      case 2:
        return result.level2Passed;
      case 3:
        return result.level3Passed;
    }
  };
}
