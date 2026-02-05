/**
 * Council State — WP 9B.8
 *
 * Legend-State observable slice for the Multi-Agent Council.
 * Consumed by CouncilTab, AgentCard, and useCouncil hook.
 */

import { observable } from '@legendapp/state';
import type { CouncilState } from './types';

const INITIAL_STATE: CouncilState = {
  activeSession: {
    running: false,
    currentAgent: null,
    events: [],
    sessionId: null,
  },
  pastSessions: [],
  selectedPastSessionId: null,
};

export const councilState$ = observable<CouncilState>({ ...INITIAL_STATE });

// Debug global
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__ATHENA_COUNCIL_STATE__ = councilState$;
}
