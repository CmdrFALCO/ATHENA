/**
 * Autonomous Mode Types — WP 9B.2
 *
 * Configuration, provenance tracking, and decision types for
 * AI auto-commit with deferred human oversight.
 */

// === Configuration ===

export interface AutonomousConfig {
  /** Master toggle — default: false */
  enabled: boolean;

  thresholds: {
    /** Min confidence to auto-accept entities. Default: 0.90 */
    autoAcceptEntity: number;
    /** Min confidence to auto-accept connections. Default: 0.85 */
    autoAcceptConnection: number;
    /** Below this → auto-reject. Default: 0.30 */
    autoRejectBelow: number;
  };

  limits: {
    /** Default: 100 */
    maxAutoCommitsPerHour: number;
    /** Default: 500 */
    maxAutoCommitsPerDay: number;
    /** Pause autonomous if review queue exceeds this. Default: 50 */
    maxPendingReview: number;
    /** Pause duration when limit hit (minutes). Default: 15 */
    cooldownMinutes: number;
  };

  scope: {
    /** e.g. ['note', 'concept'] — '*' for all */
    allowedEntityTypes: string[];
    /** e.g. ['person'] — always require human */
    blockedEntityTypes: string[];
    /** Must pass CPN validation. Default: true, NON-NEGOTIABLE */
    requireValidation: boolean;
    /** Must pass Devil's Advocate critique. Default: false */
    requireCritique: boolean;
  };

  ui: {
    /** Toast on auto-commit. Default: true */
    showNotifications: boolean;
    /** Show auto-committed proposals in chat. Default: true */
    showAutoCommitsInChat: boolean;
    /** Use cyan color for auto-approved connections. Default: true */
    highlightCyan: boolean;
  };
}

export type AutonomousPreset = 'strict' | 'balanced' | 'permissive' | 'custom';

// === Provenance ===

export interface AutoCommitProvenance {
  id: string;

  /** What was committed */
  target_type: 'entity' | 'connection';
  target_id: string;

  /** Source context */
  source: ProvenanceSource;
  /** Links back to AXIOM workflow */
  correlation_id: string;

  /** Why it was auto-approved */
  confidence: number;
  confidence_factors: ConfidenceSnapshot;

  /** Rule IDs that passed */
  validations_passed: string[];
  /** Survival score if critique ran */
  critique_survival?: number;

  /** ISO datetime */
  created_at: string;
  /** Config at time of commit */
  config_snapshot: Partial<AutonomousConfig>;

  /** Review status */
  review_status: ReviewStatus;
  reviewed_at?: string;
  review_note?: string;

  /** Reversion support */
  can_revert: boolean;
  revert_snapshot?: RevertSnapshot;
}

export type ProvenanceSource =
  | 'chat_proposal'
  | 'bulk_import'
  | 'background_enrichment'
  | 'feed_monitor';

export type ReviewStatus =
  | 'auto_approved'
  | 'pending_review'
  | 'human_confirmed'
  | 'human_reverted'
  | 'auto_rejected';

export interface ConfidenceSnapshot {
  /** Max confidence across NodeProposal/EdgeProposal items */
  proposalConfidence: number;
  /** 1.0 if passed, reduced for warnings */
  validationScore: number;
  /** Survival score if critique ran, null otherwise */
  critiqueSurvival: number | null;
  /** 1.0 if novel, lower if near-duplicate */
  noveltyScore: number;
}

export interface RevertSnapshot {
  entities: Array<{
    id: string;
    /** false = was created by this commit */
    existed_before: boolean;
    /** Entity state before modification (if existed) */
    previous_state?: Record<string, unknown>;
  }>;
  connections: Array<{
    id: string;
    existed_before: boolean;
    previous_state?: Record<string, unknown>;
  }>;
}

// === Results ===

export interface AutonomousDecision {
  action: 'auto_commit' | 'queue_for_review' | 'auto_reject' | 'disabled' | 'rate_limited';
  confidence: number;
  factors: ConfidenceSnapshot;
  /** Human-readable explanation */
  reason: string;
  /** If committed, the provenance record ID */
  provenance_id?: string;
}

// === Adapter Interface ===

export interface IProvenanceAdapter {
  initialize(): Promise<void>;
  record(provenance: AutoCommitProvenance): Promise<void>;
  getByStatus(status: ReviewStatus, limit?: number): Promise<AutoCommitProvenance[]>;
  getByCorrelation(correlationId: string): Promise<AutoCommitProvenance[]>;
  getRecent(limit: number): Promise<AutoCommitProvenance[]>;
  updateReviewStatus(id: string, status: ReviewStatus, note?: string): Promise<void>;
  getStats(hours?: number): Promise<{ total: number; byStatus: Record<ReviewStatus, number> }>;
  getRevertSnapshot(id: string): Promise<RevertSnapshot | null>;
}
