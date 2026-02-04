/**
 * Community Panel — WP 9B.7
 * Slide-over panel for community detection management.
 */

import { createPortal } from 'react-dom';
import { X, Network, RefreshCw, Loader2 } from 'lucide-react';
import { useCommunities } from '../hooks/useCommunities';
import { CommunityTree } from './CommunityTree';

interface CommunityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityPanel({ isOpen, onClose }: CommunityPanelProps) {
  const {
    hierarchy,
    stats,
    isDetecting,
    highlightedCommunityId,
    detectCommunities,
    refreshStale,
    highlightCommunity,
    clearHighlight,
  } = useCommunities();

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-80 h-full bg-athena-surface border-l border-athena-border flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-athena-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-athena-muted" />
            <h2 className="text-sm font-medium text-athena-text">
              Communities
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-athena-bg text-athena-muted hover:text-athena-text"
          >
            <X size={14} />
          </button>
        </div>

        {/* Actions bar */}
        <div className="px-3 py-2 border-b border-athena-border flex items-center gap-2">
          <button
            onClick={detectCommunities}
            disabled={isDetecting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded
              bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isDetecting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Network size={12} />
            )}
            {isDetecting ? 'Detecting...' : 'Detect'}
          </button>

          {stats && stats.staleCount > 0 && (
            <button
              onClick={refreshStale}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded
                bg-athena-bg hover:bg-athena-bg/80 text-athena-muted hover:text-athena-text
                transition-colors"
            >
              <RefreshCw size={11} />
              Refresh ({stats.staleCount})
            </button>
          )}
        </div>

        {/* Stats bar */}
        {stats && stats.totalCommunities > 0 && (
          <div className="px-3 py-1.5 border-b border-athena-border text-[10px] text-athena-muted flex items-center gap-3">
            <span>{stats.totalCommunities} communities</span>
            <span>{stats.levels} levels</span>
            <span>avg {stats.averageSize}</span>
            {stats.changesSinceDetection > 0 && (
              <span className="text-amber-400">
                {stats.changesSinceDetection} changes
              </span>
            )}
          </div>
        )}

        {/* Community tree */}
        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          {hierarchy ? (
            <CommunityTree
              hierarchy={hierarchy}
              highlightedCommunityId={highlightedCommunityId}
              onHighlight={(id) => {
                if (highlightedCommunityId === id) {
                  clearHighlight();
                } else {
                  highlightCommunity(id);
                }
              }}
            />
          ) : (
            <div className="px-3 py-6 text-center text-athena-muted text-sm">
              No communities detected yet.
              <br />
              Click "Detect" to analyze your knowledge graph.
            </div>
          )}
        </div>

        {/* Stale indicator */}
        {stats && stats.lastDetectedAt && stats.changesSinceDetection > 0 && (
          <div className="px-3 py-2 border-t border-athena-border text-[10px] text-amber-400">
            {stats.changesSinceDetection} changes since detection
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
