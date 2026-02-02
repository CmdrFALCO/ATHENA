/**
 * CPN Transition definitions for the Validation Workflow
 *
 * 6 transitions that orchestrate the validate-decide-retry loop:
 *
 * T_validate:       P_proposals → P_deciding      (run validation, attach results)
 * T_accept:         P_deciding  → P_verified       (proposal is valid)
 * T_prepare_retry:  P_deciding  → P_feedback       (build feedback, prepare retry)
 * T_regenerate:     P_feedback  → P_proposals      (regenerate with feedback)
 * T_reject:         P_deciding  → P_rejected       (max retries exceeded)
 * T_commit:         P_verified  → P_committed      (write to graph)
 *
 * Token routing: each action sets the output token's color to match
 * the destination place's acceptedColors. Transition.fire() deposits
 * into the first output place that accepts that color.
 *
 * Priority ordering: T_accept(20) > T_prepare_retry(15) > T_reject(10)
 * ensures correct routing when multiple transitions are enabled.
 *
 * @module axiom/workflows/transitions
 */

import type { TransitionConfig, GuardFunction } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { PROPOSAL } from '../types/colorSets';
import type { ValidationPlaceholders, ValidatedPayload } from './types';
import { PLACE_IDS, TRANSITION_IDS } from './types';
import { hasMinTokens } from '../guards/helpers';
import { isValid, hasErrors, tokenCanRetry, tokenShouldEscalate } from '../guards/validation';
import { FeedbackBuilder } from '../engine/FeedbackBuilder';
import { formatFeedbackForLLM } from '../types/feedback';

// ---------------------------------------------------------------------------
// T_validate — P_proposals → P_deciding
// ---------------------------------------------------------------------------

/**
 * Create T_validate: runs all validators and attaches results to token.
 *
 * Input: AetherToken<PROPOSAL> with color 'proposal'
 * Output: AetherToken<ValidatedPayload> with color 'deciding'
 */
export function createT_validate(
  placeholders: ValidationPlaceholders,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_validate,
    name: 'Validate',
    description: 'Run proposal through Der Validator (Phase 5A)',
    inputPlaces: [PLACE_IDS.P_proposals],
    outputPlaces: [PLACE_IDS.P_deciding],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
    ],
    action: async (tokens: AetherToken<PROPOSAL>[]) => {
      const inputToken = tokens[0];
      const proposal = inputToken.payload;
      const startTime = Date.now();

      // Call Phase 5A validation (placeholder in WP 9A.2, real in WP 9A.4)
      const validationResult = await placeholders.validateProposal(proposal);

      // Build validated payload: original proposal + validation result
      const validatedPayload: ValidatedPayload = {
        ...proposal,
        validationResult,
      };

      // Build validation trace entries from rules that were run
      const rulesRun = validationResult.violations.map((v) => v.ruleId);
      const uniqueRules = [...new Set(rulesRun)];
      const validationTrace = uniqueRules.map((ruleId) => ({
        ruleId,
        passed: !validationResult.violations.some(
          (v) => v.ruleId === ruleId && v.severity === 'error',
        ),
        checkedAt: validationResult.validatedAt,
        durationMs: validationResult.durationMs / Math.max(uniqueRules.length, 1),
      }));

      // Create output token preserving full state from input
      const outputToken: AetherToken<ValidatedPayload> = {
        payload: validatedPayload,
        color: 'deciding',
        retryCount: inputToken.retryCount,
        maxRetries: inputToken.maxRetries,
        feedbackHistory: [...inputToken.feedbackHistory],
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_deciding,
          previousPlace: inputToken._meta.currentPlace,
          validationTrace: [
            ...inputToken._meta.validationTrace,
            ...validationTrace,
          ],
          constraintsChecked: [
            ...inputToken._meta.constraintsChecked,
            ...uniqueRules,
          ],
          constraintsPassed: [
            ...inputToken._meta.constraintsPassed,
            ...uniqueRules.filter(
              (r) =>
                !validationResult.violations.some(
                  (v) => v.ruleId === r && v.severity === 'error',
                ),
            ),
          ],
          constraintsFailed: [
            ...inputToken._meta.constraintsFailed,
            ...validationResult.violations.map((v) => v.ruleId),
          ],
        },
      };

      return [outputToken];
    },
    priority: 10,
  };
}

// ---------------------------------------------------------------------------
// T_accept — P_deciding → P_verified
// ---------------------------------------------------------------------------

/**
 * Create T_accept: proposal passed all validation.
 *
 * Guard: isValid — validation result shows no errors.
 * Priority: 20 (highest among deciding transitions — prefer accepting).
 */
export function createT_accept(): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_accept,
    name: 'Accept',
    description: 'Proposal passed all validation',
    inputPlaces: [PLACE_IDS.P_deciding],
    outputPlaces: [PLACE_IDS.P_verified],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'is_valid',
        name: 'Is valid',
        fn: isValid as GuardFunction,
      },
    ],
    action: (tokens: AetherToken<ValidatedPayload>[]) => {
      const inputToken = tokens[0];
      const outputToken: AetherToken<ValidatedPayload> = {
        ...inputToken,
        color: 'verified',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_verified,
          previousPlace: inputToken._meta.currentPlace,
        },
      };
      return [outputToken];
    },
    priority: 20,
  };
}

// ---------------------------------------------------------------------------
// T_prepare_retry — P_deciding → P_feedback (CRITICAL: feedback accumulation)
// ---------------------------------------------------------------------------

/**
 * Create T_prepare_retry: build corrective feedback for regeneration.
 *
 * Guards: hasErrors AND tokenCanRetry.
 * Priority: 15 (between accept and reject).
 *
 * CRITICAL: Feedback is ACCUMULATED, never replaced. Each retry
 * appends new feedback to the existing feedbackHistory.
 */
export function createT_prepare_retry(): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_prepare_retry,
    name: 'Prepare Retry',
    description: 'Build feedback for regeneration attempt',
    inputPlaces: [PLACE_IDS.P_deciding],
    outputPlaces: [PLACE_IDS.P_feedback],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'has_errors',
        name: 'Has errors',
        fn: hasErrors as GuardFunction,
      },
      {
        id: 'can_retry',
        name: 'Can retry',
        fn: tokenCanRetry as GuardFunction,
      },
    ],
    action: (tokens: AetherToken<ValidatedPayload>[]) => {
      const inputToken = tokens[0];
      const { validationResult } = inputToken.payload;

      // Build structured feedback from violations
      const newFeedback = FeedbackBuilder.fromViolations(
        validationResult.violations,
        inputToken.retryCount + 1,
        inputToken.maxRetries,
      );

      // CRITICAL: Feedback is ACCUMULATED, not replaced
      const accumulatedFeedback = [
        ...inputToken.feedbackHistory,
        ...newFeedback,
      ];

      // Update payload feedbackHistory too
      const updatedPayload: ValidatedPayload = {
        ...inputToken.payload,
        feedbackHistory: accumulatedFeedback,
        attempt: inputToken.retryCount + 1,
      };

      const outputToken: AetherToken<ValidatedPayload> = {
        ...inputToken,
        payload: updatedPayload,
        color: 'feedback',
        feedbackHistory: accumulatedFeedback,
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_feedback,
          previousPlace: inputToken._meta.currentPlace,
        },
      };

      return [outputToken];
    },
    priority: 15,
  };
}

// ---------------------------------------------------------------------------
// T_regenerate — P_feedback → P_proposals
// ---------------------------------------------------------------------------

/**
 * Create T_regenerate: request new proposal with corrective feedback.
 *
 * Calls the regeneration placeholder with accumulated feedback.
 * The regenerated PROPOSAL goes back to P_proposals for re-validation.
 */
export function createT_regenerate(
  placeholders: ValidationPlaceholders,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_regenerate,
    name: 'Regenerate',
    description: 'Request new proposal with corrective feedback',
    inputPlaces: [PLACE_IDS.P_feedback],
    outputPlaces: [PLACE_IDS.P_proposals],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
    ],
    action: async (tokens: AetherToken<ValidatedPayload>[]) => {
      const inputToken = tokens[0];

      // Extract original proposal (strip validationResult)
      const { validationResult: _vr, ...originalProposal } = inputToken.payload;

      // Call regeneration with accumulated feedback
      const regeneratedProposal = await placeholders.regenerateProposal(
        originalProposal as PROPOSAL,
        inputToken.feedbackHistory,
      );

      // Sync feedbackHistory to both locations
      const syncedProposal: PROPOSAL = {
        ...regeneratedProposal,
        feedbackHistory: [...inputToken.feedbackHistory],
      };

      const outputToken: AetherToken<PROPOSAL> = {
        payload: syncedProposal,
        color: 'proposal',
        retryCount: inputToken.retryCount + 1,
        maxRetries: inputToken.maxRetries,
        feedbackHistory: [...inputToken.feedbackHistory],
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_proposals,
          previousPlace: inputToken._meta.currentPlace,
        },
      };

      return [outputToken];
    },
    priority: 10,
  };
}

// ---------------------------------------------------------------------------
// T_reject — P_deciding → P_rejected
// ---------------------------------------------------------------------------

/**
 * Create T_reject: max retries exceeded or fatal error.
 *
 * Guards: hasErrors AND tokenShouldEscalate (NOT canRetry).
 * Priority: 10 (lowest among deciding transitions — last resort).
 */
export function createT_reject(): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_reject,
    name: 'Reject',
    description: 'Max retries exceeded or fatal error',
    inputPlaces: [PLACE_IDS.P_deciding],
    outputPlaces: [PLACE_IDS.P_rejected],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
      {
        id: 'has_errors',
        name: 'Has errors',
        fn: hasErrors as GuardFunction,
      },
      {
        id: 'cannot_retry',
        name: 'Cannot retry',
        fn: tokenShouldEscalate as GuardFunction,
      },
    ],
    action: (tokens: AetherToken<ValidatedPayload>[]) => {
      const inputToken = tokens[0];
      const outputToken: AetherToken<ValidatedPayload> = {
        ...inputToken,
        color: 'rejected',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_rejected,
          previousPlace: inputToken._meta.currentPlace,
        },
      };
      return [outputToken];
    },
    priority: 10,
  };
}

// ---------------------------------------------------------------------------
// T_commit — P_verified → P_committed
// ---------------------------------------------------------------------------

/**
 * Create T_commit: write verified proposal to knowledge graph.
 */
export function createT_commit(
  placeholders: ValidationPlaceholders,
): TransitionConfig {
  return {
    id: TRANSITION_IDS.T_commit,
    name: 'Commit',
    description: 'Write verified proposal to knowledge graph',
    inputPlaces: [PLACE_IDS.P_verified],
    outputPlaces: [PLACE_IDS.P_committed],
    guards: [
      {
        id: 'has_tokens',
        name: 'Has tokens',
        fn: hasMinTokens(1),
      },
    ],
    action: async (tokens: AetherToken<ValidatedPayload>[]) => {
      const inputToken = tokens[0];

      // Extract proposal for commit (strip validationResult)
      const { validationResult: _vr, ...proposal } = inputToken.payload;
      await placeholders.commitProposal(proposal as PROPOSAL);

      const outputToken: AetherToken<ValidatedPayload> = {
        ...inputToken,
        color: 'committed',
        _meta: {
          ...inputToken._meta,
          currentPlace: PLACE_IDS.P_committed,
          previousPlace: inputToken._meta.currentPlace,
        },
      };
      return [outputToken];
    },
    priority: 10,
  };
}

// ---------------------------------------------------------------------------
// Factory: create all transitions
// ---------------------------------------------------------------------------

/**
 * Create all 6 transition configs for the validation workflow.
 */
export function createAllTransitions(
  placeholders: ValidationPlaceholders,
): TransitionConfig[] {
  return [
    createT_validate(placeholders),
    createT_accept(),
    createT_prepare_retry(),
    createT_regenerate(placeholders),
    createT_reject(),
    createT_commit(placeholders),
  ];
}
