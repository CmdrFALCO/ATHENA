import { SimilarityBadge } from './SimilarityBadge';
import type { MergeCandidate } from '../types';

interface CandidateCardProps {
  candidate: MergeCandidate;
  onCompare: (candidate: MergeCandidate) => void;
  onMerge: (candidate: MergeCandidate) => void;
  onReject: (candidate: MergeCandidate) => void;
}

export function CandidateCard({ candidate, onCompare, onMerge, onReject }: CandidateCardProps) {
  const isPending = candidate.status === 'pending';

  return (
    <div className="border border-athena-border rounded-lg p-3 bg-athena-surface">
      <div className="flex items-start justify-between gap-2 mb-2">
        <SimilarityBadge score={candidate.scores.combined} />
        {!isPending && (
          <span className="text-xs text-athena-muted capitalize">{candidate.status}</span>
        )}
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-sm font-medium text-athena-text truncate" title={candidate.noteA.title}>
          {candidate.noteA.title}
        </p>
        <div className="flex items-center gap-1 text-athena-muted">
          <span className="text-xs">~</span>
        </div>
        <p className="text-sm font-medium text-athena-text truncate" title={candidate.noteB.title}>
          {candidate.noteB.title}
        </p>
      </div>

      <div className="flex items-center gap-1 text-xs text-athena-muted mb-3">
        <span title="Title similarity">T:{Math.round(candidate.scores.title * 100)}%</span>
        <span>|</span>
        <span title="Content similarity">C:{Math.round(candidate.scores.content * 100)}%</span>
        <span>|</span>
        <span title="Embedding similarity">E:{Math.round(candidate.scores.embedding * 100)}%</span>
      </div>

      {isPending && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onCompare(candidate)}
            className="flex-1 px-2 py-1 text-xs rounded border border-athena-border text-athena-text hover:bg-athena-bg transition-colors"
          >
            Compare
          </button>
          <button
            onClick={() => onMerge(candidate)}
            className="flex-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Merge
          </button>
          <button
            onClick={() => onReject(candidate)}
            className="flex-1 px-2 py-1 text-xs rounded border border-athena-border text-athena-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
