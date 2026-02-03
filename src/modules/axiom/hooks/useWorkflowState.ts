/**
 * useWorkflowState — High-level workflow state hook
 * WP 9A.4: AXIOM Integration
 *
 * Determines the current workflow phase based on token placement
 * and provides access to transition history and retry count.
 */

import { useMemo } from 'react';
import { useSelector } from '@legendapp/state/react';
import { axiomState$ } from '../store/axiomState';
import { PLACE_IDS } from '../workflows/types';

export type WorkflowPhase =
  | 'idle'
  | 'validating'
  | 'deciding'
  | 'feedback'
  | 'critiquing'   // WP 9B.1: Devil's Advocate critique in progress
  | 'escalated'    // WP 9B.1: Critique flagged for human review
  | 'committed'
  | 'rejected';

export function useWorkflowState() {
  const activeWorkflowId = useSelector(() => axiomState$.activeWorkflowId.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());
  const recentEvents = useSelector(() => axiomState$.recentEvents.get());
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const stepCount = useSelector(() => axiomState$.stepCount.get());

  // Determine current phase based on where tokens are
  const currentPhase: WorkflowPhase = useMemo(() => {
    if (!activeWorkflowId) return 'idle';

    // Check terminal states first
    if ((tokensByPlace[PLACE_IDS.P_committed]?.length ?? 0) > 0) return 'committed';
    if ((tokensByPlace[PLACE_IDS.P_rejected]?.length ?? 0) > 0) return 'rejected';

    // WP 9B.1: Check critique states
    if ((tokensByPlace[PLACE_IDS.P_escalated]?.length ?? 0) > 0) return 'escalated';
    if ((tokensByPlace[PLACE_IDS.P_critiqued]?.length ?? 0) > 0) return 'critiquing';

    // Check active states
    if ((tokensByPlace[PLACE_IDS.P_feedback]?.length ?? 0) > 0) return 'feedback';
    if ((tokensByPlace[PLACE_IDS.P_deciding]?.length ?? 0) > 0) return 'deciding';
    if ((tokensByPlace[PLACE_IDS.P_verified]?.length ?? 0) > 0) return 'critiquing';
    if ((tokensByPlace[PLACE_IDS.P_validating]?.length ?? 0) > 0) return 'validating';
    if ((tokensByPlace[PLACE_IDS.P_proposals]?.length ?? 0) > 0) return 'validating';

    return 'idle';
  }, [activeWorkflowId, tokensByPlace]);

  // Extract transition history from recent events
  const transitionHistory = useMemo(() => {
    return recentEvents
      .filter((e) => e.type === 'transition:fired')
      .map((e) => e.data as { transitionId: string; reason: string; durationMs: number });
  }, [recentEvents]);

  // Estimate retry count from transition history
  const retryCount = useMemo(() => {
    return transitionHistory.filter(
      (t) => t.transitionId === 'T_regenerate',
    ).length;
  }, [transitionHistory]);

  return {
    activeWorkflowId,
    currentPhase,
    isRunning,
    stepCount,
    retryCount,
    transitionHistory,
    isTerminal: currentPhase === 'committed' || currentPhase === 'rejected' || currentPhase === 'escalated',
  };
}
