/**
 * CouncilTab — Main council tab content for AXIOMPanel
 * WP 9B.8
 *
 * Two sections:
 *   - Active Session (top): sequential agent cards as they complete
 *   - Past Sessions (bottom): collapsible list of previous sessions
 *
 * When a past session is selected, its transcript replaces the active view.
 */

import { useSelector } from '@legendapp/state/react';
import { Users } from 'lucide-react';
import { councilState$ } from '../../council/councilState';
import { councilActions } from '../../council/councilActions';
import { AgentCard, type AgentCardStatus } from './AgentCard';
import { CouncilResultBar } from './CouncilResultBar';
import { PastSessionsList } from './PastSessionsList';
import type { AgentRole, CouncilEvent, CouncilSession } from '../../council/types';

const AGENT_ORDER: AgentRole[] = ['generator', 'critic', 'synthesizer'];

export function CouncilTab() {
  const isRunning = useSelector(() => councilState$.activeSession.running.get());
  const currentAgent = useSelector(() => councilState$.activeSession.currentAgent.get());
  const events = useSelector(() => councilState$.activeSession.events.get());
  const sessionId = useSelector(() => councilState$.activeSession.sessionId.get());
  const selectedPastId = useSelector(() => councilState$.selectedPastSessionId.get());
  const pastSessions = useSelector(() => councilState$.pastSessions.get());

  // If a past session is selected, show its transcript
  const selectedPast = selectedPastId
    ? pastSessions.find((s) => s.id === selectedPastId) ?? null
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {selectedPast ? (
          <PastSessionView session={selectedPast} onBack={() => councilActions.selectPastSession(null)} />
        ) : sessionId || isRunning ? (
          <ActiveSessionView
            events={events}
            currentAgent={currentAgent}
            isRunning={isRunning}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      <PastSessionsList />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
        <Users className="w-5 h-5 text-purple-400" />
      </div>
      <p className="text-sm text-athena-muted">No active council session.</p>
      <p className="text-xs text-athena-muted/60 mt-1">
        Use the Council button in chat to start a deliberation.
      </p>
    </div>
  );
}

function ActiveSessionView({
  events,
  currentAgent,
  isRunning,
}: {
  events: CouncilEvent[];
  currentAgent: AgentRole | null;
  isRunning: boolean;
}) {
  // Determine each agent's status from events
  const agentStatus = (role: AgentRole): AgentCardStatus => {
    const completed = events.some(
      (e) => e.type === 'agent_complete' && e.agent === role,
    );
    if (completed) return 'complete';
    if (currentAgent === role && isRunning) return 'running';
    return 'pending';
  };

  const getAgentSummary = (role: AgentRole): string | undefined => {
    const ev = events.find(
      (e) => e.type === 'agent_complete' && e.agent === role,
    );
    return ev?.type === 'agent_complete' ? ev.summary : undefined;
  };

  const getAgentDuration = (role: AgentRole): number | undefined => {
    const ev = events.find(
      (e) => e.type === 'agent_complete' && e.agent === role,
    );
    return ev?.type === 'agent_complete' ? ev.durationMs : undefined;
  };

  const isComplete = events.some(
    (e) => e.type === 'council_complete' || e.type === 'council_empty' || e.type === 'council_error',
  );

  return (
    <div className="p-3 space-y-2">
      {AGENT_ORDER.map((role) => (
        <AgentCard
          key={role}
          role={role}
          status={agentStatus(role)}
          summary={getAgentSummary(role)}
          durationMs={getAgentDuration(role)}
        />
      ))}
      {isComplete && <CouncilResultBar events={events} />}
    </div>
  );
}

function PastSessionView({
  session,
  onBack,
}: {
  session: CouncilSession;
  onBack: () => void;
}) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          &larr; Back
        </button>
        <span className="text-xs text-athena-muted truncate flex-1">{session.query}</span>
      </div>

      {/* Replay agent cards from session data */}
      <AgentCard
        role="generator"
        status="complete"
        summary={session.generatorResponse.slice(0, 80) + '...'}
        durationMs={session.agentTimings.generator}
        rawResponse={session.generatorResponse}
      />
      <AgentCard
        role="critic"
        status="complete"
        summary={session.criticResponse.slice(0, 80) + '...'}
        durationMs={session.agentTimings.critic}
        rawResponse={session.criticResponse}
      />
      <AgentCard
        role="synthesizer"
        status="complete"
        summary={session.synthesizerResponse.slice(0, 80) + '...'}
        durationMs={session.agentTimings.synthesizer}
        rawResponse={session.synthesizerResponse}
      />

      <div className="text-xs text-athena-muted pt-1">
        {session.proposalsCount} proposal{session.proposalsCount !== 1 ? 's' : ''}
        {session.droppedCount > 0 && ` (${session.droppedCount} dropped)`}
        {' · '}
        {(session.totalDurationMs / 1000).toFixed(1)}s total
      </div>

      {session.councilNotes.length > 0 && (
        <div className="px-3 py-1.5 rounded bg-athena-surface/50 text-[11px] text-athena-muted space-y-0.5">
          {session.councilNotes.map((note, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-purple-400 shrink-0">·</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
