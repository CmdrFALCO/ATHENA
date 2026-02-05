/**
 * useCouncil — React hook for council state and actions
 * WP 9B.8
 *
 * Exposes council observable slices as reactive values
 * and wraps councilActions for convenience.
 */

import { useSelector } from '@legendapp/state/react';
import { councilState$ } from '../council/councilState';
import { councilActions } from '../council/councilActions';
import type { CouncilEvent, CouncilSession, AgentRole } from '../council/types';

export interface UseCouncilReturn {
  // Active session
  isRunning: boolean;
  currentAgent: AgentRole | null;
  events: CouncilEvent[];
  sessionId: string | null;

  // Past sessions
  pastSessions: CouncilSession[];
  selectedPastSessionId: string | null;

  // Actions
  cancelCouncil: () => void;
  selectPastSession: (id: string | null) => void;
}

export function useCouncil(): UseCouncilReturn {
  const isRunning = useSelector(() => councilState$.activeSession.running.get());
  const currentAgent = useSelector(() => councilState$.activeSession.currentAgent.get());
  const events = useSelector(() => councilState$.activeSession.events.get());
  const sessionId = useSelector(() => councilState$.activeSession.sessionId.get());
  const pastSessions = useSelector(() => councilState$.pastSessions.get());
  const selectedPastSessionId = useSelector(() => councilState$.selectedPastSessionId.get());

  return {
    isRunning,
    currentAgent,
    events,
    sessionId,
    pastSessions,
    selectedPastSessionId,
    cancelCouncil: councilActions.cancelCouncil,
    selectPastSession: councilActions.selectPastSession,
  };
}
