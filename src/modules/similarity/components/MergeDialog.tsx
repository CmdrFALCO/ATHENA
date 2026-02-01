import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';
import type { MergeCandidate, MergeContentStrategy, MergeOptions } from '../types';

interface MergeDialogProps {
  candidate: MergeCandidate;
  onConfirm: (options: MergeOptions) => void;
  onCancel: () => void;
}

export function MergeDialog({ candidate, onConfirm, onCancel }: MergeDialogProps) {
  const mergeDefaults = useSelector(() => devSettings$.similarity.merge.get());

  const [primaryNoteId, setPrimaryNoteId] = useState(candidate.noteA.id);
  const [contentStrategy, setContentStrategy] = useState<MergeContentStrategy>(
    mergeDefaults.defaultContentStrategy
  );
  const [transferConnections, setTransferConnections] = useState(mergeDefaults.transferConnections);
  const [transferClusters, setTransferClusters] = useState(mergeDefaults.transferClusters);

  const secondaryNoteId =
    primaryNoteId === candidate.noteA.id ? candidate.noteB.id : candidate.noteA.id;
  const secondaryTitle =
    primaryNoteId === candidate.noteA.id ? candidate.noteB.title : candidate.noteA.title;

  const handleConfirm = () => {
    onConfirm({
      primaryNoteId,
      secondaryNoteId,
      contentStrategy,
      transferConnections,
      transferClusters,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-athena-surface border border-athena-border rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-4 py-3 border-b border-athena-border">
          <h3 className="text-sm font-medium text-athena-text">Merge Notes</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Primary note selection */}
          <div>
            <p className="text-xs text-athena-muted mb-2">Keep (primary note):</p>
            <label className="flex items-center gap-2 mb-1 cursor-pointer">
              <input
                type="radio"
                name="primary"
                checked={primaryNoteId === candidate.noteA.id}
                onChange={() => setPrimaryNoteId(candidate.noteA.id)}
                className="text-blue-500"
              />
              <span className="text-sm text-athena-text truncate">{candidate.noteA.title}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="primary"
                checked={primaryNoteId === candidate.noteB.id}
                onChange={() => setPrimaryNoteId(candidate.noteB.id)}
                className="text-blue-500"
              />
              <span className="text-sm text-athena-text truncate">{candidate.noteB.title}</span>
            </label>
          </div>

          {/* Content strategy */}
          <div>
            <p className="text-xs text-athena-muted mb-2">Content strategy:</p>
            <div className="space-y-1">
              {(
                [
                  ['keep_primary', 'Keep primary only'],
                  ['concatenate', 'Append secondary content'],
                  ['keep_secondary', 'Keep secondary only'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={contentStrategy === value}
                    onChange={() => setContentStrategy(value)}
                    className="text-blue-500"
                  />
                  <span className="text-sm text-athena-text">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Transfer options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transferConnections}
                onChange={(e) => setTransferConnections(e.target.checked)}
                className="text-blue-500 rounded"
              />
              <span className="text-sm text-athena-text">Transfer connections</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transferClusters}
                onChange={(e) => setTransferClusters(e.target.checked)}
                className="text-blue-500 rounded"
              />
              <span className="text-sm text-athena-text">Transfer cluster memberships</span>
            </label>
          </div>

          {/* Warning */}
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">
              &quot;{secondaryTitle}&quot; will be deleted after merge.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-athena-border">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded border border-athena-border text-athena-muted hover:text-athena-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Merge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
