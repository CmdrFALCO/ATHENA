/**
 * TransitionLog — Chronological decision trail (Principle 2: Transparency)
 * WP 9A.3: AXIOM Visualization
 *
 * Shows every fired transition with its reason field.
 * The reason is ALWAYS visible — never omitted. Every decision is justified.
 */

import { useState, useMemo, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { Search, Download, ArrowRight } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import type { AXIOMEvent, TransitionFiredEventData } from '../events/types';

interface TransitionLogEntry {
  timestamp: string;
  transitionId: string;
  reason: string;
  durationMs: number;
}

function useTransitionEntries(): TransitionLogEntry[] {
  const recentEvents = useSelector(() => axiomState$.recentEvents.get());

  return useMemo(() => {
    return recentEvents
      .filter((e: AXIOMEvent) => e.type === 'transition:fired')
      .map((e: AXIOMEvent) => {
        const data = e.data as TransitionFiredEventData;
        return {
          timestamp: e.timestamp,
          transitionId: data.transitionId,
          reason: data.reason,
          durationMs: data.durationMs,
        };
      });
  }, [recentEvents]);
}

/** Transition name → color */
function transitionColor(id: string): string {
  const map: Record<string, string> = {
    T_validate: 'text-cyan-400',
    T_accept: 'text-green-400',
    T_prepare_retry: 'text-amber-400',
    T_regenerate: 'text-purple-400',
    T_reject: 'text-red-400',
    T_commit: 'text-emerald-300',
  };
  return map[id] ?? 'text-athena-text';
}

/** Known from→to for transitions */
const TRANSITION_ROUTES: Record<string, [string, string]> = {
  T_validate: ['P_proposals', 'P_deciding'],
  T_accept: ['P_deciding', 'P_verified'],
  T_prepare_retry: ['P_deciding', 'P_feedback'],
  T_regenerate: ['P_feedback', 'P_proposals'],
  T_reject: ['P_deciding', 'P_rejected'],
  T_commit: ['P_verified', 'P_committed'],
};

export function TransitionLog() {
  const entries = useTransitionEntries();
  const [filter, setFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filter !== 'all') {
      result = result.filter((e) => e.transitionId === filter);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.reason.toLowerCase().includes(q) ||
          e.transitionId.toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, filter, searchText]);

  const transitionIds = useMemo(() => {
    const ids = new Set(entries.map((e) => e.transitionId));
    return ['all', ...Array.from(ids)];
  }, [entries]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiom-transition-log-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-2 py-2 border-b border-athena-border space-y-2 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-athena-muted" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by reason..."
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded bg-athena-surface border border-athena-border text-athena-text placeholder-athena-muted"
          />
        </div>

        {/* Filter + Export */}
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-2 py-1 text-xs rounded bg-athena-surface border border-athena-border text-athena-text"
          >
            {transitionIds.map((id) => (
              <option key={id} value={id}>
                {id === 'all' ? 'All transitions' : id}
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={entries.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-athena-surface border border-athena-border text-athena-muted hover:text-athena-text disabled:opacity-40 transition-colors"
            title="Export as JSON"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-athena-muted">
            {entries.length === 0
              ? 'No transitions fired yet.'
              : 'No matches for current filter.'}
          </div>
        ) : (
          <div className="divide-y divide-athena-border">
            {filteredEntries.map((entry, idx) => {
              const route = TRANSITION_ROUTES[entry.transitionId];
              return (
                <div key={`${entry.timestamp}-${idx}`} className="px-3 py-2.5 hover:bg-athena-surface/50">
                  {/* Time + transition */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-athena-muted font-mono tabular-nums shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-medium ${transitionColor(entry.transitionId)}`}>
                      {entry.transitionId}
                    </span>
                    {entry.durationMs > 0 && (
                      <span className="text-[10px] text-athena-muted ml-auto tabular-nums">
                        {entry.durationMs.toFixed(1)}ms
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  {route && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-athena-muted">
                      <span>{route[0]}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span>{route[1]}</span>
                    </div>
                  )}

                  {/* Reason — ALWAYS visible (Principle 2) */}
                  {entry.reason && (
                    <p className="mt-1 text-[11px] text-athena-text leading-relaxed">
                      Reason: "{entry.reason}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
