/**
 * ReviewStatsBar — Compact stats bar at top of review tab
 * WP 9B.4
 *
 * Shows: Pending count | Auto-approved (24h) | Avg confidence | Refresh button
 */

import { RefreshCw } from 'lucide-react';
import type { ReviewStats } from '../../autonomous/review/types';

interface ReviewStatsBarProps {
  stats: ReviewStats;
  highlightThreshold: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ReviewStatsBar({
  stats,
  highlightThreshold,
  onRefresh,
  isLoading,
}: ReviewStatsBarProps) {
  const pendingHighlight = stats.pendingCount > highlightThreshold;

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-athena-border text-[11px] shrink-0">
      <div className="flex items-center gap-1">
        <span className="text-athena-muted">Pending:</span>
        <span
          className={`font-bold ${
            pendingHighlight ? 'text-amber-400' : 'text-athena-text'
          }`}
        >
          {stats.pendingCount}
        </span>
      </div>

      <span className="text-athena-border">|</span>

      <div className="flex items-center gap-1">
        <span className="text-athena-muted">Auto approved:</span>
        <span className="text-athena-text">{stats.autoApproved24h}</span>
      </div>

      <span className="text-athena-border">|</span>

      <div className="flex items-center gap-1">
        <span className="text-athena-muted">Avg:</span>
        <span className="text-athena-text tabular-nums">
          {stats.avgConfidence > 0 ? stats.avgConfidence.toFixed(2) : '--'}
        </span>
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto p-1 rounded hover:bg-athena-surface text-athena-muted hover:text-athena-text transition-colors disabled:opacity-50"
        title="Refresh queue"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
