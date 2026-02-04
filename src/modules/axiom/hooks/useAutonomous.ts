/**
 * useAutonomous — React hook for autonomous mode state and actions
 * WP 9B.2
 *
 * Exposes autonomous mode configuration, runtime stats,
 * and control actions (pause/resume/revert).
 */

import { useSelector } from '@legendapp/state/react';
import { useCallback } from 'react';
import { devSettings$ } from '@/config/devSettings';
import { autonomousState$, autonomousActions } from '../autonomous/autonomousState';
import type { AutonomousDecision } from '../autonomous/types';

export function useAutonomous() {
  // Config from DevSettings
  const isEnabled = useSelector(() => devSettings$.axiom.autonomous.enabled.get());
  const preset = useSelector(() => devSettings$.axiom.autonomous.preset.get());
  const highlightCyan = useSelector(() => devSettings$.axiom.autonomous.ui.highlightCyan.get());
  const showNotifications = useSelector(() => devSettings$.axiom.autonomous.ui.showNotifications.get());

  // Runtime state
  const isPaused = useSelector(() => autonomousState$.isPaused.get());
  const pauseReason = useSelector(() => autonomousState$.pauseReason.get());
  const autoCommitsThisHour = useSelector(() => autonomousState$.autoCommitsThisHour.get());
  const autoCommitsToday = useSelector(() => autonomousState$.autoCommitsToday.get());
  const pendingReviewCount = useSelector(() => autonomousState$.pendingReviewCount.get());
  const lastAutoCommitAt = useSelector(() => autonomousState$.lastAutoCommitAt.get());
  const recentDecisions = useSelector(() => autonomousState$.recentDecisions.get());

  // Actions
  const pause = useCallback((reason = 'Manually paused') => {
    autonomousActions.pause(reason);
  }, []);

  const resume = useCallback(() => {
    autonomousActions.resume();
  }, []);

  return {
    // Config
    isEnabled,
    preset,
    highlightCyan,
    showNotifications,

    // Runtime
    isPaused,
    pauseReason,
    stats: {
      autoCommitsThisHour,
      autoCommitsToday,
      pendingReviewCount,
    },
    lastAutoCommitAt,
    recentDecisions: recentDecisions as AutonomousDecision[],

    // Actions
    pause,
    resume,
  };
}
