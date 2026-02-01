// Types
export type {
  JobType,
  JobStatus,
  BackgroundJob,
  JobResult,
  JobConfig,
  JobsConfig,
  SimilarityScanConfig,
  OrphanDetectionConfig,
  StaleConnectionConfig,
  EmbeddingRefreshConfig,
  ValidationSweepConfig,
  JobEvent,
  JobEventHandler,
} from './types';

// Adapter
export { SQLiteJobAdapter } from './adapters/JobAdapter';
export type { IJobAdapter } from './adapters/JobAdapter';

// Runner and Scheduler
export { JobRunner } from './JobRunner';
export { JobScheduler } from './JobScheduler';

// Job implementations
export {
  SimilarityScanJob,
  OrphanDetectionJob,
  StaleConnectionJob,
  EmbeddingRefreshJob,
  ValidationSweepJob,
} from './implementations';
export type { IBackgroundJob, ProgressCallback } from './implementations';

// State
export { jobsState$ } from './store/jobState';
export type { JobsState } from './store/jobState';
export {
  initializeJobs,
  refreshRecentJobs,
  runJobNow,
  stopScheduler,
  restartScheduler,
  getSchedulerStatus,
} from './store/jobActions';

// Components
export { JobsPanel, JobProgress } from './components';
