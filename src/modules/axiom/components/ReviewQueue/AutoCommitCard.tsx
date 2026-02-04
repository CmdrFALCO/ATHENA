/**
 * AutoCommitCard — Spot-check card for auto-approved items
 * WP 9B.4
 *
 * Simpler card showing entity preview, confidence, timestamp, and revert button.
 */

import { FileText, Link2, Clock, Undo2 } from 'lucide-react';
import type { AutoCommitProvenance } from '../../autonomous/types';
import { formatRelativeTime } from '@/shared/utils/formatTime';

interface AutoCommitCardProps {
  provenance: AutoCommitProvenance;
  onRevert: (provenanceId: string) => void;
}

function getConfidenceBadgeColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 0.5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
}

export function AutoCommitCard({ provenance, onRevert }: AutoCommitCardProps) {
  const isEntity = provenance.target_type === 'entity';

  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-athena-border rounded-lg">
      {/* Icon */}
      {isEntity ? (
        <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      )}

      {/* Title */}
      <span className="text-[11px] text-athena-text truncate flex-1">
        {provenance.target_id}
      </span>

      {/* Confidence */}
      <span
        className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded border tabular-nums ${getConfidenceBadgeColor(
          provenance.confidence,
        )}`}
      >
        {Math.round(provenance.confidence * 100)}%
      </span>

      {/* Timestamp */}
      <span className="flex items-center gap-0.5 text-[10px] text-athena-muted shrink-0">
        <Clock className="w-2.5 h-2.5" />
        {formatRelativeTime(provenance.created_at)}
      </span>

      {/* Revert button */}
      {provenance.can_revert && (
        <button
          onClick={() => onRevert(provenance.id)}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium
            text-athena-muted hover:text-red-400 border border-athena-border rounded
            hover:border-red-500/30 transition-colors shrink-0"
          title="Revert this auto-commit"
        >
          <Undo2 className="w-3 h-3" />
          Revert
        </button>
      )}
    </div>
  );
}
