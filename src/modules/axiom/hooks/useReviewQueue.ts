/**
 * useReviewQueue — React hook for the review queue
 * WP 9B.4
 *
 * Provides reactive access to review queue state, actions,
 * and event-driven refresh via AXIOMEventBridge.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import { reviewState$, reviewActions } from '../autonomous/review/reviewState';
import { ReviewActions } from '../autonomous/review/ReviewActions';
import { autonomousState$ } from '../autonomous/autonomousState';
import { devSettings$ } from '@/config/devSettings';
import type { IProvenanceAdapter, AutoCommitProvenance } from '../autonomous/types';
import type { AXIOMEventBridge } from '../events/AXIOMEventBridge';
import type { AutonomousCommitService } from '../autonomous/AutonomousCommitService';
import type {
  ReviewQueueItem,
  ReviewSortField,
  ReviewFilterReason,
} from '../autonomous/review/types';
import type { ReviewQueueReason } from '../events/types';

interface UseReviewQueueDeps {
  provenanceAdapter: IProvenanceAdapter | null;
  eventBridge: AXIOMEventBridge | null;
  commitService: AutonomousCommitService | null;
}

/**
 * Classify the queue reason from a provenance record's review_note or confidence.
 */
function classifyReason(provenance: AutoCommitProvenance): ReviewQueueReason {
  const note = (provenance.review_note ?? '').toLowerCase();
  if (note.includes('floor veto')) return 'floor_veto';
  if (note.includes('rate limit')) return 'rate_limited';
  if (note.includes('validation')) return 'validation_failed';
  if (note.includes('blocked') || note.includes('not in allowed')) return 'scope_restricted';
  return 'low_confidence';
}

function sortItems(items: ReviewQueueItem[], sort: ReviewSortField): ReviewQueueItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'confidence_asc':
      return sorted.sort((a, b) => a.provenance.confidence - b.provenance.confidence);
    case 'confidence_desc':
      return sorted.sort((a, b) => b.provenance.confidence - a.provenance.confidence);
    case 'date_asc':
      return sorted.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
    case 'date_desc':
      return sorted.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
    case 'reason':
      return sorted.sort((a, b) => a.queueReason.localeCompare(b.queueReason));
    default:
      return sorted;
  }
}

function filterItems(items: ReviewQueueItem[], filter: ReviewFilterReason): ReviewQueueItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.queueReason === filter);
}

export function useReviewQueue(deps: UseReviewQueueDeps) {
  const { provenanceAdapter, eventBridge, commitService } = deps;

  // Observable state
  const rawItems = useSelector(() => reviewState$.items.get());
  const recentAutoApproved = useSelector(() => reviewState$.recentAutoApproved.get());
  const stats = useSelector(() => reviewState$.stats.get());
  const isLoading = useSelector(() => reviewState$.isLoading.get());
  const selectedIds = useSelector(() => reviewState$.selectedIds.get());
  const sort = useSelector(() => reviewState$.sort.get());
  const filterReason = useSelector(() => reviewState$.filterReason.get());
  const activeTab = useSelector(() => reviewState$.activeTab.get());
  const showAutoApprovedSection = useSelector(() =>
    devSettings$.axiom.autonomous.enabled.get(),
  );

  // ReviewActions service ref
  const reviewActionsRef = useRef<ReviewActions | null>(null);

  useEffect(() => {
    reviewActionsRef.current = new ReviewActions(
      provenanceAdapter!,
      eventBridge,
      commitService,
    );
  }, [provenanceAdapter, eventBridge, commitService]);

  // Sorted and filtered items (client-side)
  const items = useMemo(() => {
    const filtered = filterItems(rawItems as ReviewQueueItem[], filterReason as ReviewFilterReason);
    return sortItems(filtered, sort as ReviewSortField);
  }, [rawItems, sort, filterReason]);

  // --- Data loading ---

  const loadQueue = useCallback(async () => {
    if (!provenanceAdapter) return;

    reviewActions.setLoading(true);
    try {
      const pending = await provenanceAdapter.getByStatus('pending_review', 100);

      const queueItems: ReviewQueueItem[] = pending.map((p) => ({
        provenance: p,
        confidenceResult: p.confidence_result,
        queueReason: classifyReason(p),
        queuedAt: p.created_at,
      }));

      reviewActions.setItems(queueItems);

      // Update the autonomous state pending count
      autonomousState$.pendingReviewCount.set(queueItems.length);
    } catch (err) {
      console.error('[AXIOM/Review] Failed to load queue:', err);
    } finally {
      reviewActions.setLoading(false);
    }
  }, [provenanceAdapter]);

  const loadRecentAutoApproved = useCallback(async (limit = 20) => {
    if (!provenanceAdapter) return;

    try {
      const autoApproved = await provenanceAdapter.getByStatus('auto_approved', limit);
      reviewActions.setRecentAutoApproved(autoApproved);
    } catch (err) {
      console.error('[AXIOM/Review] Failed to load auto-approved:', err);
    }
  }, [provenanceAdapter]);

  const loadStats = useCallback(async () => {
    if (!provenanceAdapter) return;

    try {
      const stats24h = await provenanceAdapter.getStats(24);
      const pending = await provenanceAdapter.getByStatus('pending_review');

      const totalDecisions = stats24h.total || 1;
      const rejections =
        stats24h.byStatus.human_reverted + stats24h.byStatus.auto_rejected;

      // Calculate avg confidence from pending items
      const pendingItems = reviewState$.items.peek() as ReviewQueueItem[];
      const avgConfidence =
        pendingItems.length > 0
          ? pendingItems.reduce((sum, item) => sum + item.provenance.confidence, 0) /
            pendingItems.length
          : 0;

      reviewActions.setStats({
        pendingCount: pending.length,
        autoApproved24h: stats24h.byStatus.auto_approved,
        autoRejected24h: stats24h.byStatus.auto_rejected,
        humanConfirmed24h: stats24h.byStatus.human_confirmed,
        humanReverted24h: stats24h.byStatus.human_reverted,
        avgConfidence,
        rejectionRate: rejections / totalDecisions,
      });
    } catch (err) {
      console.error('[AXIOM/Review] Failed to load stats:', err);
    }
  }, [provenanceAdapter]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), loadRecentAutoApproved(), loadStats()]);
  }, [loadQueue, loadRecentAutoApproved, loadStats]);

  // --- Initial load ---

  useEffect(() => {
    if (provenanceAdapter) {
      loadQueue();
      loadRecentAutoApproved();
      loadStats();
    }
  }, [provenanceAdapter, loadQueue, loadRecentAutoApproved, loadStats]);

  // --- Event bridge subscription ---

  useEffect(() => {
    if (!eventBridge) return;

    const handleQueued = () => {
      loadQueue();
      loadStats();
    };

    const handleDecided = () => {
      loadStats();
    };

    const handleBatchDecided = () => {
      loadStats();
    };

    eventBridge.on('review:queued', handleQueued);
    eventBridge.on('review:decided', handleDecided);
    eventBridge.on('review:batch_decided', handleBatchDecided);

    return () => {
      eventBridge.off('review:queued', handleQueued);
      eventBridge.off('review:decided', handleDecided);
      eventBridge.off('review:batch_decided', handleBatchDecided);
    };
  }, [eventBridge, loadQueue, loadStats]);

  // --- Actions ---

  const approve = useCallback(async (provenanceId: string) => {
    if (!reviewActionsRef.current) return;

    // Optimistic removal
    reviewActions.removeItem(provenanceId);

    try {
      await reviewActionsRef.current.approve(provenanceId);
      loadStats();
    } catch (err) {
      console.error('[AXIOM/Review] Approve failed:', err);
      // Re-fetch to restore state
      loadQueue();
    }
  }, [loadQueue, loadStats]);

  const reject = useCallback(async (provenanceId: string, reason?: string) => {
    if (!reviewActionsRef.current) return;

    // Optimistic removal
    reviewActions.removeItem(provenanceId);

    try {
      await reviewActionsRef.current.reject(provenanceId, reason);
      loadStats();
    } catch (err) {
      console.error('[AXIOM/Review] Reject failed:', err);
      loadQueue();
    }
  }, [loadQueue, loadStats]);

  const editAndApprove = useCallback(
    async (provenanceId: string, edits: { title?: string; description?: string }) => {
      if (!reviewActionsRef.current) return;

      reviewActions.removeItem(provenanceId);

      try {
        await reviewActionsRef.current.editAndApprove(provenanceId, edits);
        loadStats();
      } catch (err) {
        console.error('[AXIOM/Review] Edit & approve failed:', err);
        loadQueue();
      }
    },
    [loadQueue, loadStats],
  );

  const bulkApprove = useCallback(async () => {
    if (!reviewActionsRef.current) return;

    const ids = reviewState$.selectedIds.peek();
    if (ids.length === 0) return;

    // Optimistic removal
    reviewActions.removeItems(ids);

    try {
      await reviewActionsRef.current.bulkApprove(ids);
      reviewActions.clearSelection();
      loadStats();
    } catch (err) {
      console.error('[AXIOM/Review] Bulk approve failed:', err);
      loadQueue();
    }
  }, [loadQueue, loadStats]);

  const bulkReject = useCallback(async () => {
    if (!reviewActionsRef.current) return;

    const ids = reviewState$.selectedIds.peek();
    if (ids.length === 0) return;

    reviewActions.removeItems(ids);

    try {
      await reviewActionsRef.current.bulkReject(ids);
      reviewActions.clearSelection();
      loadStats();
    } catch (err) {
      console.error('[AXIOM/Review] Bulk reject failed:', err);
      loadQueue();
    }
  }, [loadQueue, loadStats]);

  const revert = useCallback(async (provenanceId: string) => {
    if (!commitService) return;

    try {
      await commitService.revert(provenanceId);
      loadRecentAutoApproved();
      loadStats();
    } catch (err) {
      console.error('[AXIOM/Review] Revert failed:', err);
    }
  }, [commitService, loadRecentAutoApproved, loadStats]);

  return {
    // Data
    items,
    stats,
    recentAutoApproved: recentAutoApproved as AutoCommitProvenance[],
    isLoading,
    selectedIds: selectedIds as string[],
    sort: sort as ReviewSortField,
    filterReason: filterReason as ReviewFilterReason,
    activeTab,
    showAutoApprovedSection,

    // Item actions
    approve,
    reject,
    editAndApprove,
    revert,

    // Batch actions
    bulkApprove,
    bulkReject,

    // Selection
    toggleSelection: reviewActions.toggleSelection,
    selectAll: reviewActions.selectAll,
    clearSelection: reviewActions.clearSelection,

    // Sort/filter
    setSort: reviewActions.setSort,
    setFilter: reviewActions.setFilter,

    // Tab
    setActiveTab: reviewActions.setActiveTab,

    // Refresh
    refresh: refreshAll,
  };
}
