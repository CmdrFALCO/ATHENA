import { observable } from '@legendapp/state';
import type { BackgroundJob, JobType } from '../types';

export interface JobsState {
  /** Currently running jobs */
  runningJobs: BackgroundJob[];

  /** Recent job history (last 20) */
  recentJobs: BackgroundJob[];

  /** Scheduler status */
  schedulerRunning: boolean;

  /** Job results summary (for quick UI display) */
  lastResults: Partial<Record<JobType, {
    success: boolean;
    itemsAffected: number;
    completedAt: string;
  }>>;

  /** Loading state */
  loading: boolean;
}

export const jobsState$ = observable<JobsState>({
  runningJobs: [],
  recentJobs: [],
  schedulerRunning: false,
  lastResults: {},
  loading: false,
});

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_JOBS_STATE__ = jobsState$;
}
