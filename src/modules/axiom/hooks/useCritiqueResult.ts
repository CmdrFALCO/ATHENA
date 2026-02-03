/**
 * useCritiqueResult — Hook to retrieve critique result for a proposal
 * WP 9B.1: Devil's Advocate
 *
 * Reads from AXIOM state — tokens in P_critiqued, P_committed, P_escalated,
 * P_rejected may have critiqueResult attached to _meta.
 *
 * Bridges the gap between AXIOM (axiom module) and ProposalCard (chat module)
 * using correlationId as the link.
 */

import { useMemo } from 'react';
import { useSelector } from '@legendapp/state/react';
import { axiomState$ } from '../store/axiomState';
import type { CRITIQUE_RESULT } from '../types/critique';

export interface UseCritiqueResultReturn {
  /** The critique result, if available */
  critiqueResult: CRITIQUE_RESULT | null;
  /** True if critique was skipped (fast path) */
  critiqueSkipped: boolean;
  /** True if token is currently being critiqued (in T_critique) */
  isBeingCritiqued: boolean;
}

/**
 * Hook to retrieve critique result for a proposal by correlationId.
 *
 * Searches across AXIOM recent events and token state to find
 * a token matching the correlationId and extracts its _meta.critiqueResult.
 */
export function useCritiqueResult(correlationId: string): UseCritiqueResultReturn {
  const recentEvents = useSelector(() => axiomState$.recentEvents.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());
  const isRunning = useSelector(() => axiomState$.isRunning.get());

  return useMemo(() => {
    if (!correlationId) {
      return { critiqueResult: null, critiqueSkipped: false, isBeingCritiqued: false };
    }

    // Check for critique:completed events with matching correlationId
    const completedEvent = recentEvents.find(
      (e) =>
        e.type === 'critique:completed' &&
        (e.data as { correlationId?: string })?.correlationId === correlationId,
    );

    if (completedEvent) {
      const data = completedEvent.data as {
        critiqueResult?: CRITIQUE_RESULT;
        survivalScore?: number;
        recommendation?: string;
      };
      // If the event has full result data attached, use it
      if (data.critiqueResult) {
        return {
          critiqueResult: data.critiqueResult,
          critiqueSkipped: false,
          isBeingCritiqued: false,
        };
      }
    }

    // Check for critique:skipped events
    const skippedEvent = recentEvents.find(
      (e) =>
        e.type === 'critique:skipped' &&
        (e.data as { correlationId?: string })?.correlationId === correlationId,
    );

    if (skippedEvent) {
      return { critiqueResult: null, critiqueSkipped: true, isBeingCritiqued: false };
    }

    // Check if currently being critiqued (token in P_verified with active critique)
    const isBeingCritiqued =
      isRunning &&
      recentEvents.some(
        (e) =>
          e.type === 'critique:started' &&
          (e.data as { correlationId?: string })?.correlationId === correlationId,
      ) &&
      !completedEvent &&
      !skippedEvent;

    // Check if there are tokens in critiqued-related places matching this correlation
    const hasCritiquedTokens = (tokensByPlace['P_critiqued']?.length ?? 0) > 0;
    const hasCommittedTokens = (tokensByPlace['P_committed']?.length ?? 0) > 0;
    const hasEscalatedTokens = (tokensByPlace['P_escalated']?.length ?? 0) > 0;

    // If we know there was a completed critique event but couldn't extract the result,
    // return what we know
    if (completedEvent && (hasCritiquedTokens || hasCommittedTokens || hasEscalatedTokens)) {
      return { critiqueResult: null, critiqueSkipped: false, isBeingCritiqued: false };
    }

    return {
      critiqueResult: null,
      critiqueSkipped: false,
      isBeingCritiqued,
    };
  }, [correlationId, recentEvents, tokensByPlace, isRunning]);
}
