/**
 * Council Actions — WP 9B.8
 *
 * State mutations for the Multi-Agent Council.
 */

import { councilState$ } from './councilState';
import type { AgentRole, CouncilEvent, CouncilSession } from './types';

export const councilActions = {
  /** Start a new council session */
  startCouncil(sessionId: string): void {
    councilState$.activeSession.set({
      running: true,
      currentAgent: null,
      events: [],
      sessionId,
    });
  },

  /** Append a council event and update currentAgent */
  onCouncilEvent(event: CouncilEvent): void {
    const events = councilState$.activeSession.events.peek();
    councilState$.activeSession.events.set([...events, event]);

    if (event.type === 'agent_start') {
      councilState$.activeSession.currentAgent.set(event.agent);
    } else if (event.type === 'agent_complete') {
      councilState$.activeSession.currentAgent.set(null);
    } else if (
      event.type === 'council_complete' ||
      event.type === 'council_error' ||
      event.type === 'council_empty'
    ) {
      councilState$.activeSession.running.set(false);
      councilState$.activeSession.currentAgent.set(null);
    }
  },

  /** Cancel a running council session */
  cancelCouncil(): void {
    councilState$.activeSession.running.set(false);
    councilState$.activeSession.currentAgent.set(null);
  },

  /** Load past sessions from persistence */
  setPastSessions(sessions: CouncilSession[]): void {
    councilState$.pastSessions.set(sessions);
  },

  /** Add a completed session to the past sessions list */
  addPastSession(session: CouncilSession): void {
    const current = councilState$.pastSessions.peek();
    councilState$.pastSessions.set([session, ...current]);
  },

  /** Select a past session for viewing */
  selectPastSession(id: string | null): void {
    councilState$.selectedPastSessionId.set(id);
  },

  /** Reset all council state */
  reset(): void {
    councilState$.activeSession.set({
      running: false,
      currentAgent: null,
      events: [],
      sessionId: null,
    });
    councilState$.pastSessions.set([]);
    councilState$.selectedPastSessionId.set(null);
  },
};
