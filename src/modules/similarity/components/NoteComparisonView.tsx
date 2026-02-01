import { createPortal } from 'react-dom';
import { SimilarityBadge } from './SimilarityBadge';
import type { MergeCandidate, NoteReference } from '../types';

interface NoteComparisonViewProps {
  candidate: MergeCandidate;
  onMerge: (candidate: MergeCandidate) => void;
  onReject: (candidate: MergeCandidate) => void;
  onClose: () => void;
}

function NoteColumn({ note, label }: { note: NoteReference; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-athena-muted mb-1">{label}</div>
      <h4 className="text-sm font-medium text-athena-text truncate mb-2">{note.title}</h4>
      <div className="space-y-1 text-xs text-athena-muted">
        <p>Created: {new Date(note.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(note.updatedAt).toLocaleDateString()}</p>
        <p>{note.connectionCount} connections</p>
        <p>{note.clusterCount} clusters</p>
      </div>
      <div className="mt-3 p-2 rounded bg-athena-bg text-xs text-athena-muted leading-relaxed max-h-40 overflow-y-auto">
        {note.contentPreview || <span className="italic">No content</span>}
      </div>
    </div>
  );
}

export function NoteComparisonView({
  candidate,
  onMerge,
  onReject,
  onClose,
}: NoteComparisonViewProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-athena-surface border border-athena-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
          <h3 className="text-sm font-medium text-athena-text">Compare Notes</h3>
          <button
            onClick={onClose}
            className="text-athena-muted hover:text-athena-text transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-4 mb-4">
            <NoteColumn note={candidate.noteA} label="Note A" />
            <div className="w-px bg-athena-border shrink-0" />
            <NoteColumn note={candidate.noteB} label="Note B" />
          </div>

          {/* Score breakdown */}
          <div className="border-t border-athena-border pt-3">
            <p className="text-xs text-athena-muted mb-2">Similarity Scores</p>
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="text-athena-muted">Title: </span>
                <SimilarityBadge score={candidate.scores.title} size="sm" />
              </div>
              <div className="text-xs">
                <span className="text-athena-muted">Content: </span>
                <SimilarityBadge score={candidate.scores.content} size="sm" />
              </div>
              <div className="text-xs">
                <span className="text-athena-muted">Embedding: </span>
                <SimilarityBadge score={candidate.scores.embedding} size="sm" />
              </div>
              <div className="text-xs">
                <span className="text-athena-muted">Combined: </span>
                <SimilarityBadge score={candidate.scores.combined} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-athena-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-athena-border text-athena-muted hover:text-athena-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onReject(candidate)}
            className="px-3 py-1.5 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onMerge(candidate)}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Merge...
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
