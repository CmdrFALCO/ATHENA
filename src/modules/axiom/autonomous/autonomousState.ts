/**
 * Autonomous State — WP 9B.2
 *
 * Legend-State observable slice for autonomous mode runtime stats.
 * Consumed by UI components (AXIOMIndicator, ProposalCards, AutoCommitToast).
 */

import { observable } from '@legendapp/state';
import type { AutonomousDecision } from './types';

export interface AutonomousState {
  /** Auto-commits in the current hour (from rate limiter) */
  autoCommitsThisHour: number;
  /** Auto-commits in the last 24h */
  autoCommitsToday: number;
  /** Items waiting for human review */
  pendingReviewCount: number;
  /** ISO timestamp of last auto-commit */
  lastAutoCommitAt: string | null;

  /** Last N decisions for UI display */
  recentDecisions: AutonomousDecision[];

  /** Whether autonomous is paused (rate limit or manual) */
  isPaused: boolean;
  /** Reason for pause */
  pauseReason: string | null;
}

const INITIAL_STATE: AutonomousState = {
  autoCommitsThisHour: 0,
  autoCommitsToday: 0,
  pendingReviewCount: 0,
  lastAutoCommitAt: null,
  recentDecisions: [],
  isPaused: false,
  pauseReason: null,
};

export const autonomousState$ = observable<AutonomousState>({ ...INITIAL_STATE });

/** Maximum recent decisions to keep in state */
const MAX_RECENT_DECISIONS = 20;

export const autonomousActions = {
  recordDecision(decision: AutonomousDecision): void {
    const current = autonomousState$.recentDecisions.peek();
    const updated = [decision, ...current].slice(0, MAX_RECENT_DECISIONS);
    autonomousState$.recentDecisions.set(updated);

    if (decision.action === 'auto_commit') {
      autonomousState$.autoCommitsThisHour.set(
        autonomousState$.autoCommitsThisHour.peek() + 1,
      );
      autonomousState$.autoCommitsToday.set(
        autonomousState$.autoCommitsToday.peek() + 1,
      );
      autonomousState$.lastAutoCommitAt.set(new Date().toISOString());
    }

    if (decision.action === 'rate_limited') {
      autonomousState$.isPaused.set(true);
      autonomousState$.pauseReason.set(decision.reason);
    }
  },

  updateStats(stats: {
    autoCommitsThisHour: number;
    autoCommitsToday: number;
    pendingReviewCount: number;
  }): void {
    autonomousState$.autoCommitsThisHour.set(stats.autoCommitsThisHour);
    autonomousState$.autoCommitsToday.set(stats.autoCommitsToday);
    autonomousState$.pendingReviewCount.set(stats.pendingReviewCount);
  },

  pause(reason: string): void {
    autonomousState$.isPaused.set(true);
    autonomousState$.pauseReason.set(reason);
  },

  resume(): void {
    autonomousState$.isPaused.set(false);
    autonomousState$.pauseReason.set(null);
  },

  reset(): void {
    autonomousState$.set({ ...INITIAL_STATE });
  },
};

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_AUTONOMOUS_STATE__: typeof autonomousState$ })
    .__ATHENA_AUTONOMOUS_STATE__ = autonomousState$;
}
