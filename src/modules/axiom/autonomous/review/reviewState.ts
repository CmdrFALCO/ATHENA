/**
 * Review Queue State — WP 9B.4
 *
 * Legend-State observable slice for the review queue.
 * Consumed by ReviewQueueTab and AXIOMIndicator.
 */

import { observable } from '@legendapp/state';
import type { AutoCommitProvenance } from '../types';
import type { ReviewQueueItem, ReviewStats, ReviewSortField, ReviewFilterReason } from './types';

export type ReviewActiveTab = 'workflow' | 'review';

export interface ReviewQueueState {
  items: ReviewQueueItem[];
  recentAutoApproved: AutoCommitProvenance[];
  stats: ReviewStats;
  isLoading: boolean;
  selectedIds: string[];
  sort: ReviewSortField;
  filterReason: ReviewFilterReason;
  activeTab: ReviewActiveTab;
}

const INITIAL_STATS: ReviewStats = {
  pendingCount: 0,
  autoApproved24h: 0,
  autoRejected24h: 0,
  humanConfirmed24h: 0,
  humanReverted24h: 0,
  avgConfidence: 0,
  rejectionRate: 0,
};

const INITIAL_STATE: ReviewQueueState = {
  items: [],
  recentAutoApproved: [],
  stats: { ...INITIAL_STATS },
  isLoading: false,
  selectedIds: [],
  sort: 'confidence_asc',
  filterReason: 'all',
  activeTab: 'workflow',
};

export const reviewState$ = observable<ReviewQueueState>({ ...INITIAL_STATE });

export const reviewActions = {
  setItems(items: ReviewQueueItem[]): void {
    reviewState$.items.set(items);
    reviewState$.stats.pendingCount.set(items.length);
  },

  setRecentAutoApproved(items: AutoCommitProvenance[]): void {
    reviewState$.recentAutoApproved.set(items);
  },

  setStats(stats: ReviewStats): void {
    reviewState$.stats.set(stats);
  },

  setLoading(loading: boolean): void {
    reviewState$.isLoading.set(loading);
  },

  toggleSelection(id: string): void {
    const current = reviewState$.selectedIds.peek();
    if (current.includes(id)) {
      reviewState$.selectedIds.set(current.filter((i) => i !== id));
    } else {
      reviewState$.selectedIds.set([...current, id]);
    }
  },

  selectAll(): void {
    const allIds = reviewState$.items.peek().map((item) => item.provenance.id);
    reviewState$.selectedIds.set(allIds);
  },

  clearSelection(): void {
    reviewState$.selectedIds.set([]);
  },

  setSort(field: ReviewSortField): void {
    reviewState$.sort.set(field);
  },

  setFilter(reason: ReviewFilterReason): void {
    reviewState$.filterReason.set(reason);
  },

  setActiveTab(tab: ReviewActiveTab): void {
    reviewState$.activeTab.set(tab);
  },

  removeItem(provenanceId: string): void {
    const current = reviewState$.items.peek();
    reviewState$.items.set(current.filter((i) => i.provenance.id !== provenanceId));

    // Also remove from selection
    const selected = reviewState$.selectedIds.peek();
    if (selected.includes(provenanceId)) {
      reviewState$.selectedIds.set(selected.filter((id) => id !== provenanceId));
    }

    // Update pending count
    reviewState$.stats.pendingCount.set(
      reviewState$.items.peek().length,
    );
  },

  removeItems(provenanceIds: string[]): void {
    const idSet = new Set(provenanceIds);
    const current = reviewState$.items.peek();
    reviewState$.items.set(current.filter((i) => !idSet.has(i.provenance.id)));

    const selected = reviewState$.selectedIds.peek();
    reviewState$.selectedIds.set(selected.filter((id) => !idSet.has(id)));

    reviewState$.stats.pendingCount.set(
      reviewState$.items.peek().length,
    );
  },

  reset(): void {
    reviewState$.set({ ...INITIAL_STATE });
  },
};

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_REVIEW_STATE__: typeof reviewState$ })
    .__ATHENA_REVIEW_STATE__ = reviewState$;
}
