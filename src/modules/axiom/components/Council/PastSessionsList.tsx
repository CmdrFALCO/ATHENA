/**
 * PastSessionsList — Collapsible list of previous council sessions
 * WP 9B.8
 *
 * Each entry shows truncated query + timestamp + proposal count.
 * Click loads transcript into the agent cards view.
 */

import { useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { councilState$ } from '../../council/councilState';
import { councilActions } from '../../council/councilActions';
import { devSettings$ } from '@/config/devSettings';
import type { CouncilSession } from '../../council/types';

export function PastSessionsList() {
  const [expanded, setExpanded] = useState(false);
  const pastSessions = useSelector(() => councilState$.pastSessions.get());
  const selectedId = useSelector(() => councilState$.selectedPastSessionId.get());
  const maxSessions = useSelector(() => devSettings$.axiom.council?.ui?.maxPastSessions?.get() ?? 20);

  const visibleSessions = pastSessions.slice(0, maxSessions);

  if (visibleSessions.length === 0) return null;

  return (
    <div className="border-t border-athena-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-athena-muted
                   hover:text-athena-text hover:bg-athena-surface/50 transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        <span className="font-medium">Past Sessions</span>
        <span className="text-[10px]">({visibleSessions.length})</span>
        <span className="ml-auto">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="max-h-[200px] overflow-y-auto">
          {visibleSessions.map((session) => (
            <PastSessionEntry
              key={session.id}
              session={session}
              isSelected={session.id === selectedId}
              onClick={() =>
                councilActions.selectPastSession(
                  session.id === selectedId ? null : session.id,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PastSessionEntry({
  session,
  isSelected,
  onClick,
}: {
  session: CouncilSession;
  isSelected: boolean;
  onClick: () => void;
}) {
  const date = new Date(session.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
        ${isSelected
          ? 'bg-purple-500/10 text-purple-300 border-l-2 border-purple-500'
          : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface/50 border-l-2 border-transparent'
        }`}
    >
      <span className="flex-1 truncate">{session.query}</span>
      <span className="shrink-0 text-[10px]">
        {session.proposalsCount}p
      </span>
      <span className="shrink-0 text-[10px] text-athena-muted/60">
        {dateStr} {timeStr}
      </span>
    </button>
  );
}
