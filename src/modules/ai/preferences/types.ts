/**
 * Preference Learning Types
 * WP 8.4 - Preference Learning
 *
 * Types for tracking user accept/reject decisions on AI proposals
 * and using them to adjust future confidence scores.
 */

/**
 * A recorded user decision on an AI proposal
 */
export interface PreferenceSignal {
  id: string;
  /** Type of proposal */
  proposalType: 'note' | 'connection';
  /** User's action */
  action: 'accept' | 'reject';
  /** Original confidence score from AI */
  confidenceAtProposal: number;
  /** Hash of context used for this proposal (for pattern matching) */
  contextHash: string | null;
  /** Additional metadata for pattern analysis */
  metadata: SignalMetadata;
  /** When the decision was made */
  createdAt: string;
}

export interface SignalMetadata {
  /** For notes: proposed title length, content length */
  titleLength?: number;
  contentLength?: number;
  /** For connections: relationship type, source/target types */
  relationshipType?: string;
  sourceType?: string;
  targetType?: string;
  /** Thread context */
  threadId?: string;
  /** How many proposals were in the same batch */
  batchSize?: number;
  /** Position in batch (1-indexed) */
  batchPosition?: number;
}

/**
 * Aggregated statistics for preference learning
 */
export interface PreferenceStats {
  /** Total signals recorded */
  totalSignals: number;
  /** Breakdown by type and action */
  byType: {
    note: { accepted: number; rejected: number; acceptRate: number };
    connection: { accepted: number; rejected: number; acceptRate: number };
  };
  /** Average confidence of accepted vs rejected */
  confidenceAnalysis: {
    acceptedAvgConfidence: number;
    rejectedAvgConfidence: number;
  };
  /** Time range of data */
  oldestSignal: string | null;
  newestSignal: string | null;
}

/**
 * Confidence adjustment recommendation
 */
export interface ConfidenceAdjustment {
  /** Original confidence from AI */
  original: number;
  /** Adjusted confidence based on learning */
  adjusted: number;
  /** Factors that influenced adjustment */
  factors: AdjustmentFactor[];
}

export interface AdjustmentFactor {
  name: string;
  impact: number; // -1 to +1
  reason: string;
}

/**
 * Configuration for preference learning
 */
export interface PreferenceLearningConfig {
  /** Enable preference tracking */
  enabled: boolean;
  /** Number of recent signals to consider for adjustments */
  windowSize: number;
  /** How much historical data influences adjustments (0-1) */
  learningRate: number;
  /** Minimum signals before applying adjustments */
  minSignalsForAdjustment: number;
  /** Show learning insights in UI */
  showInsights: boolean;
}
