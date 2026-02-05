/**
 * CouncilResultBar — Summary bar shown after council completes
 * WP 9B.8
 *
 * Shows: "N proposals generated (M dropped) · Total: X.Xs"
 * Plus any council notes from the synthesis pass.
 */

import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { CouncilEvent } from '../../council/types';

interface CouncilResultBarProps {
  events: CouncilEvent[];
}

export function CouncilResultBar({ events }: CouncilResultBarProps) {
  // Find the proposals_ready event
  const proposalsEvent = events.find((e) => e.type === 'proposals_ready');
  const completeEvent = events.find((e) => e.type === 'council_complete');
  const emptyEvent = events.find((e) => e.type === 'council_empty');
  const errorEvent = events.find((e) => e.type === 'council_error');

  // Calculate total duration from agent_complete events
  const totalMs = events
    .filter((e): e is Extract<CouncilEvent, { type: 'agent_complete' }> => e.type === 'agent_complete')
    .reduce((sum, e) => sum + e.durationMs, 0);

  if (errorEvent && errorEvent.type === 'council_error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Council error{errorEvent.agent ? ` in ${errorEvent.agent}` : ''}: {errorEvent.error}</span>
      </div>
    );
  }

  if (emptyEvent && emptyEvent.type === 'council_empty') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>No proposals generated: {emptyEvent.reason}</span>
      </div>
    );
  }

  if (!proposalsEvent || proposalsEvent.type !== 'proposals_ready') return null;

  const { proposals, councilNotes } = proposalsEvent;
  const nodeCount = proposals.nodes.length;
  const edgeCount = proposals.edges.length;
  const totalProposals = nodeCount + edgeCount;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">
          {totalProposals} proposal{totalProposals !== 1 ? 's' : ''} generated
          ({nodeCount} node{nodeCount !== 1 ? 's' : ''}, {edgeCount} edge{edgeCount !== 1 ? 's' : ''})
          {totalMs > 0 && (
            <span className="text-athena-muted"> · {(totalMs / 1000).toFixed(1)}s</span>
          )}
        </span>
        {completeEvent && (
          <span className="text-[10px] text-green-500/60">Sent to chat</span>
        )}
      </div>

      {/* Council notes */}
      {councilNotes.length > 0 && (
        <div className="px-3 py-1.5 rounded bg-athena-surface/50 text-[11px] text-athena-muted space-y-0.5">
          {councilNotes.map((note, i) => (
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
