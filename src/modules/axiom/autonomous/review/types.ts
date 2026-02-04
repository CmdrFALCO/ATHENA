/**
 * Review Queue Types — WP 9B.4
 *
 * Types for the human review queue: items awaiting approval,
 * stats, sorting, filtering, and configuration.
 */

import type { AutoCommitProvenance } from '../types';
import type { ConfidenceResult } from '../confidence/types';
import type { ReviewQueueReason } from '../../events/types';

export interface ReviewQueueItem {
  provenance: AutoCommitProvenance;
  confidenceResult?: ConfidenceResult;
  queueReason: ReviewQueueReason;
  queuedAt: string; // ISO date
}

export interface ReviewStats {
  pendingCount: number;
  autoApproved24h: number;
  autoRejected24h: number;
  humanConfirmed24h: number;
  humanReverted24h: number;
  avgConfidence: number;
  rejectionRate: number;
}

export type ReviewSortField =
  | 'confidence_asc'
  | 'confidence_desc'
  | 'date_asc'
  | 'date_desc'
  | 'reason';

export type ReviewFilterReason = 'all' | ReviewQueueReason;

export interface ReviewQueueConfig {
  defaultSort: ReviewSortField;
  showAutoApprovedSection: boolean;
  autoApprovedLimit: number;
  highlightThreshold: number;
}
