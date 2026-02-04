/**
 * ReviewQueueTab — Main container for the review queue
 * WP 9B.4
 *
 * Composes: ReviewStatsBar, ReviewFilters, ReviewBatchActions,
 * ReviewCard list, and AutoCommitCard spot-check section.
 */

import { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Inbox } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { useReviewQueue } from '../../hooks/useReviewQueue';
import { devSettings$ } from '@/config/devSettings';
import { ReviewStatsBar } from './ReviewStatsBar';
import { ReviewFilters } from './ReviewFilters';
import { ReviewBatchActions } from './ReviewBatchActions';
import { ReviewCard } from './ReviewCard';
import { AutoCommitCard } from './AutoCommitCard';
import type { ReviewQueueItem } from '../../autonomous/review/types';
import type { AutoCommitProvenance } from '../../autonomous/types';

export function ReviewQueueTab() {
  const highlightThreshold = useSelector(() => devSettings$.axiom.reviewQueue.highlightThreshold.get());
  const showAutoApprovedSetting = useSelector(() => devSettings$.axiom.reviewQueue.showAutoApprovedSection.get());
  const [autoApprovedOpen, setAutoApprovedOpen] = useState(false);

  // The hook needs adapter dependencies — pass null for now (wired in app init)
  // In production, these would be injected via context or module singleton
  const queue = useReviewQueue({
    provenanceAdapter: null,
    eventBridge: null,
    commitService: null,
  });

  const {
    items,
    stats,
    recentAutoApproved,
    isLoading,
    selectedIds,
    sort,
    filterReason,
    showAutoApprovedSection,
    approve,
    reject,
    editAndApprove,
    revert,
    bulkApprove,
    bulkReject,
    toggleSelection,
    selectAll,
    clearSelection,
    setSort,
    setFilter,
    refresh,
  } = queue;

  const hasSelection = selectedIds.length > 0;
  const showAutoApproved = showAutoApprovedSetting && recentAutoApproved.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <ReviewStatsBar
        stats={stats}
        highlightThreshold={highlightThreshold}
        onRefresh={refresh}
        isLoading={isLoading}
      />

      {/* Filters */}
      <ReviewFilters
        sort={sort}
        filter={filterReason}
        onSort={setSort}
        onFilter={setFilter}
      />

      {/* Batch actions */}
      {hasSelection && (
        <ReviewBatchActions
          count={selectedIds.length}
          onApproveAll={bulkApprove}
          onRejectAll={bulkReject}
          onClear={clearSelection}
        />
      )}

      {/* Pending review items */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-athena-muted animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-athena-muted">
          <CheckCircle className="w-8 h-8 text-emerald-500/50" />
          <span className="text-sm">All caught up!</span>
          <span className="text-xs">No items pending review</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 p-2">
          {/* Select all helper */}
          {items.length > 1 && (
            <button
              onClick={hasSelection ? clearSelection : selectAll}
              className="text-[10px] text-athena-muted hover:text-athena-text transition-colors px-1"
            >
              {hasSelection ? 'Clear selection' : `Select all (${items.length})`}
            </button>
          )}

          {(items as ReviewQueueItem[]).map((item) => (
            <ReviewCard
              key={item.provenance.id}
              item={item}
              isSelected={selectedIds.includes(item.provenance.id)}
              onToggleSelect={toggleSelection}
              onApprove={approve}
              onReject={reject}
              onEditAndApprove={editAndApprove}
            />
          ))}
        </div>
      )}

      {/* Recent auto-approved (collapsible spot-check) */}
      {showAutoApproved && (
        <div className="border-t border-athena-border shrink-0">
          <button
            onClick={() => setAutoApprovedOpen(!autoApprovedOpen)}
            className="flex items-center gap-1.5 w-full px-3 py-2 text-[11px] text-athena-muted
              hover:text-athena-text transition-colors"
          >
            {autoApprovedOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span>Recent Auto-Approved ({recentAutoApproved.length})</span>
          </button>

          {autoApprovedOpen && (
            <div className="space-y-1.5 px-2 pb-2 max-h-48 overflow-y-auto">
              {(recentAutoApproved as AutoCommitProvenance[]).map((item) => (
                <AutoCommitCard
                  key={item.id}
                  provenance={item}
                  onRevert={revert}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
