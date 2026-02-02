/**
 * useAXIOM — Main hook for AXIOM engine access
 * WP 9A.4: AXIOM Integration
 *
 * Provides reactive state and actions for the AXIOM workflow engine.
 */

import { useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import type { PROPOSAL } from '../types/colorSets';
import type { WorkflowResult } from '../workflows/types';

// Lazy import to avoid circular dependency
let _processProposal: ((proposal: PROPOSAL) => Promise<WorkflowResult>) | null = null;

async function getProcessProposal() {
  if (!_processProposal) {
    const { axiomValidationService } = await import('../services/AXIOMValidationService');
    _processProposal = (p: PROPOSAL) => axiomValidationService.processProposal(p);
  }
  return _processProposal;
}

export function useAXIOM() {
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const isPaused = useSelector(() => axiomState$.isPaused.get());
  const activeWorkflowId = useSelector(() => axiomState$.activeWorkflowId.get());
  const stepCount = useSelector(() => axiomState$.stepCount.get());
  const lastError = useSelector(() => axiomState$.lastError.get());
  const stats = useSelector(() => axiomState$.stats.get());

  const pause = useCallback(() => axiomActions.pauseWorkflow(), []);
  const resume = useCallback(() => axiomActions.resumeWorkflow(), []);
  const reset = useCallback(() => axiomActions.reset(), []);

  const processProposal = useCallback(async (proposal: PROPOSAL): Promise<WorkflowResult> => {
    const fn = await getProcessProposal();
    return fn(proposal);
  }, []);

  return {
    // State
    isRunning,
    isPaused,
    activeWorkflowId,
    stepCount,
    lastError,
    stats,
    isActive: !!activeWorkflowId,

    // Actions
    pause,
    resume,
    reset,

    // Process a new proposal
    processProposal,
  };
}
