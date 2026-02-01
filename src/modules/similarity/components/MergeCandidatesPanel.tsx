import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMergeCandidates } from '../hooks/useMergeCandidates';
import { useMerge } from '../hooks/useMerge';
import { CandidateCard } from './CandidateCard';
import { NoteComparisonView } from './NoteComparisonView';
import { MergeDialog } from './MergeDialog';
import { initSimilarityServices } from '../store/similarityActions';
import { getDatabase } from '@/database/init';
import {
  useNoteAdapter,
  useConnectionAdapter,
  useEmbeddingAdapter,
  useClusterAdapter,
} from '@/adapters/hooks';
import type { MergeCandidate, CandidateStatus, MergeOptions } from '../types';

interface MergeCandidatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: CandidateStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'all', label: 'All' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'merged', label: 'Merged' },
];

export function MergeCandidatesPanel({ isOpen, onClose }: MergeCandidatesPanelProps) {
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();
  const embeddingAdapter = useEmbeddingAdapter();
  const clusterAdapter = useClusterAdapter();

  const {
    candidates,
    scanProgress,
    filterStatus,
    isInitialized,
    scanAll,
    abortScan,
    setFilter,
    refresh,
  } = useMergeCandidates();

  const { merge, reject, isMerging } = useMerge();

  const [comparing, setComparing] = useState<MergeCandidate | null>(null);
  const [merging, setMerging] = useState<MergeCandidate | null>(null);

  // Initialize services on first open
  useEffect(() => {
    if (isOpen && !isInitialized) {
      const db = getDatabase();
      if (db) {
        initSimilarityServices(db, noteAdapter, connectionAdapter, embeddingAdapter, clusterAdapter);
      }
    }
  }, [isOpen, isInitialized, noteAdapter, connectionAdapter, embeddingAdapter, clusterAdapter]);

  // Load candidates when services become available
  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  const handleMergeConfirm = async (options: MergeOptions) => {
    if (!merging) return;
    await merge(merging.id, options);
    setMerging(null);
    setComparing(null);
  };

  const handleReject = async (candidate: MergeCandidate) => {
    await reject(candidate.id);
    setComparing(null);
  };

  const isScanning = scanProgress.status === 'scanning';

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 pointer-events-none">
      <div className="relative w-[380px] max-h-[80vh] bg-athena-surface border border-athena-border rounded-lg shadow-xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border shrink-0">
          <div>
            <h3 className="text-sm font-medium text-athena-text">Similar Notes</h3>
            <p className="text-xs text-athena-muted">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isScanning ? (
              <button
                onClick={abortScan}
                className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => scanAll()}
                disabled={!isInitialized}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Scan
              </button>
            )}
            <button
              onClick={onClose}
              className="text-athena-muted hover:text-athena-text transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scan progress */}
        {isScanning && (
          <div className="px-4 py-2 border-b border-athena-border shrink-0">
            <div className="flex items-center justify-between text-xs text-athena-muted mb-1">
              <span>
                Scanning {scanProgress.notesScanned}/{scanProgress.totalNotes}
              </span>
              <span>{scanProgress.candidatesFound} found</span>
            </div>
            <div className="h-1 bg-athena-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${scanProgress.totalNotes > 0 ? (scanProgress.notesScanned / scanProgress.totalNotes) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="px-4 py-2 border-b border-athena-border shrink-0">
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filterStatus === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'text-athena-muted hover:text-athena-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!isInitialized && (
            <p className="text-xs text-athena-muted text-center py-4">Initializing...</p>
          )}
          {isInitialized && candidates.length === 0 && (
            <p className="text-xs text-athena-muted text-center py-4">
              {isScanning ? 'Scanning...' : 'No candidates found. Try running a scan.'}
            </p>
          )}
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onCompare={setComparing}
              onMerge={setMerging}
              onReject={handleReject}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <div className="px-4 py-2 border-t border-athena-border shrink-0">
          <span className="text-xs text-athena-muted">Ctrl+Shift+M to toggle</span>
        </div>
      </div>

      {/* Comparison overlay */}
      {comparing && !merging && (
        <NoteComparisonView
          candidate={comparing}
          onMerge={(c) => {
            setMerging(c);
          }}
          onReject={(c) => {
            handleReject(c);
          }}
          onClose={() => setComparing(null)}
        />
      )}

      {/* Merge dialog overlay */}
      {merging && (
        <MergeDialog
          candidate={merging}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMerging(null)}
        />
      )}

      {/* Merging overlay */}
      {isMerging && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-athena-surface border border-athena-border rounded-lg px-6 py-4 shadow-xl">
            <p className="text-sm text-athena-text">Merging notes...</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
