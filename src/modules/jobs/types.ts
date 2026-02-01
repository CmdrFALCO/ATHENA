// src/modules/jobs/types.ts — WP 8.6: Background Jobs

export type JobType =
  | 'similarity_scan'      // Find new merge candidates
  | 'orphan_detection'     // Notes with no connections
  | 'stale_connection'     // Connections to deleted notes
  | 'embedding_refresh'    // Re-embed notes without embeddings
  | 'validation_sweep';    // Re-run all validations

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;              // 0-100

  scheduledAt: string;           // ISO timestamp
  startedAt?: string;
  completedAt?: string;

  result?: JobResult;
  error?: string;
}

export interface JobResult {
  itemsProcessed: number;        // Total items examined
  itemsAffected: number;         // Items that triggered action
  durationMs: number;            // Execution time
  details: Record<string, unknown>;  // Job-specific data
}

export interface JobConfig {
  enabled: boolean;
  intervalHours: number;
}

export interface SimilarityScanConfig extends JobConfig {
  threshold: number;             // Default: 0.85
  batchSize: number;             // Notes per batch
}

export interface OrphanDetectionConfig extends JobConfig {
  minAgeDays: number;            // Don't flag new notes (default: 7)
}

export interface StaleConnectionConfig extends JobConfig {
  autoDelete: boolean;           // Auto-delete invalid connections (default: true)
}

export interface EmbeddingRefreshConfig extends JobConfig {
  batchSize: number;             // Notes per batch (default: 50)
}

export interface ValidationSweepConfig extends JobConfig {
  // Uses existing validation rules
}

export interface JobsConfig {
  enabled: boolean;              // Master switch

  similarityScan: SimilarityScanConfig;
  orphanDetection: OrphanDetectionConfig;
  staleConnection: StaleConnectionConfig;
  embeddingRefresh: EmbeddingRefreshConfig;
  validationSweep: ValidationSweepConfig;
}

// Event types for UI updates
export interface JobEvent {
  type: 'started' | 'progress' | 'completed' | 'failed';
  job: BackgroundJob;
}

export type JobEventHandler = (event: JobEvent) => void;
