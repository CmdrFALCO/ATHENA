/**
 * AXIOM Legend-State actions
 *
 * State mutations for the AXIOM store. Called by the event bridge
 * to keep reactive state in sync with engine state.
 *
 * @module axiom/store/axiomActions
 */

import { axiomState$ } from './axiomState';
import type { AXIOMEvent } from '../events/types';

const MAX_RECENT_EVENTS = 50;

export const axiomActions = {
  // --- Lifecycle ---

  startWorkflow(workflowId: string): void {
    axiomState$.activeWorkflowId.set(workflowId);
    axiomState$.isRunning.set(true);
    axiomState$.isPaused.set(false);
    axiomState$.stepCount.set(0);
  },

  pauseWorkflow(): void {
    axiomState$.isPaused.set(true);
  },

  resumeWorkflow(): void {
    axiomState$.isPaused.set(false);
  },

  stopWorkflow(): void {
    axiomState$.isRunning.set(false);
    axiomState$.isPaused.set(false);
    axiomState$.activeWorkflowId.set(null);
  },

  // --- Token updates (called by event bridge) ---

  updateTokenPlacement(tokenId: string, placeId: string): void {
    const byPlace = axiomState$.tokensByPlace.get();
    const updated = { ...byPlace };

    // Remove token from previous place
    for (const [pid, tokenIds] of Object.entries(updated)) {
      const idx = tokenIds.indexOf(tokenId);
      if (idx !== -1) {
        updated[pid] = tokenIds.filter((id) => id !== tokenId);
        if (updated[pid].length === 0) {
          delete updated[pid];
        }
      }
    }

    // Add to new place
    if (!updated[placeId]) {
      updated[placeId] = [];
    }
    updated[placeId] = [...updated[placeId], tokenId];

    axiomState$.tokensByPlace.set(updated);

    // Update total count
    let total = 0;
    for (const ids of Object.values(updated)) {
      total += ids.length;
    }
    axiomState$.totalTokens.set(total);
  },

  removeToken(tokenId: string): void {
    const byPlace = axiomState$.tokensByPlace.get();
    const updated = { ...byPlace };

    for (const [pid, tokenIds] of Object.entries(updated)) {
      const idx = tokenIds.indexOf(tokenId);
      if (idx !== -1) {
        updated[pid] = tokenIds.filter((id) => id !== tokenId);
        if (updated[pid].length === 0) {
          delete updated[pid];
        }
      }
    }

    axiomState$.tokensByPlace.set(updated);

    let total = 0;
    for (const ids of Object.values(updated)) {
      total += ids.length;
    }
    axiomState$.totalTokens.set(total);
  },

  // --- Step tracking ---

  setStepCount(count: number): void {
    axiomState$.stepCount.set(count);
  },

  // --- Events ---

  addEvent(event: AXIOMEvent): void {
    const current = axiomState$.recentEvents.get();
    const updated = [...current, event];
    if (updated.length > MAX_RECENT_EVENTS) {
      updated.splice(0, updated.length - MAX_RECENT_EVENTS);
    }
    axiomState$.recentEvents.set(updated);
  },

  clearEvents(): void {
    axiomState$.recentEvents.set([]);
  },

  // --- Stats ---

  recordWorkflowComplete(success: boolean, retries: number): void {
    const stats = axiomState$.stats.get();
    const totalRuns = stats.totalWorkflowsRun + 1;
    const newAvgRetries =
      (stats.averageRetries * stats.totalWorkflowsRun + retries) / totalRuns;

    axiomState$.stats.set({
      totalWorkflowsRun: totalRuns,
      successfulWorkflows: stats.successfulWorkflows + (success ? 1 : 0),
      failedWorkflows: stats.failedWorkflows + (success ? 0 : 1),
      averageRetries: newAvgRetries,
    });
  },

  // --- Reset ---

  reset(): void {
    axiomState$.isRunning.set(false);
    axiomState$.isPaused.set(false);
    axiomState$.stepCount.set(0);
    axiomState$.activeWorkflowId.set(null);
    axiomState$.tokensByPlace.set({});
    axiomState$.totalTokens.set(0);
    axiomState$.recentEvents.set([]);
    axiomState$.stats.set({
      totalWorkflowsRun: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageRetries: 0,
    });
  },
};
