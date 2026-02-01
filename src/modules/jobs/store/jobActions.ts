import { jobsState$ } from './jobState';
import type { BackgroundJob, JobType, JobsConfig } from '../types';
import type { JobRunner } from '../JobRunner';
import type { JobScheduler } from '../JobScheduler';
import type { IJobAdapter } from '../adapters/JobAdapter';

let runner: JobRunner | null = null;
let scheduler: JobScheduler | null = null;
let adapter: IJobAdapter | null = null;

/**
 * Initialize the jobs system.
 * Must be called once after database and adapters are ready.
 */
export async function initializeJobs(
  jobRunner: JobRunner,
  jobScheduler: JobScheduler,
  jobAdapter: IJobAdapter,
  config: JobsConfig
): Promise<void> {
  runner = jobRunner;
  scheduler = jobScheduler;
  adapter = jobAdapter;

  // Subscribe to job events for state management
  runner.subscribe((event) => {
    switch (event.type) {
      case 'started':
        jobsState$.runningJobs.set([
          ...jobsState$.runningJobs.get(),
          event.job,
        ]);
        break;

      case 'progress':
        jobsState$.runningJobs.set(
          jobsState$.runningJobs.get().map((j) =>
            j.id === event.job.id ? event.job : j
          )
        );
        break;

      case 'completed':
      case 'failed': {
        // Remove from running
        jobsState$.runningJobs.set(
          jobsState$.runningJobs.get().filter((j) => j.id !== event.job.id)
        );

        // Add to recent
        jobsState$.recentJobs.set([
          event.job,
          ...jobsState$.recentJobs.get().slice(0, 19),
        ]);

        // Update last result
        if (event.type === 'completed' && event.job.result) {
          jobsState$.lastResults[event.job.type].set({
            success: true,
            itemsAffected: event.job.result.itemsAffected,
            completedAt: event.job.completedAt!,
          });
        } else if (event.type === 'failed') {
          jobsState$.lastResults[event.job.type].set({
            success: false,
            itemsAffected: 0,
            completedAt: event.job.completedAt!,
          });
        }
        break;
      }
    }
  });

  // Start scheduler
  if (config.enabled) {
    await scheduler.start(config);
    jobsState$.schedulerRunning.set(true);
  }

  // Load recent history
  await refreshRecentJobs();
}

/**
 * Refresh recent job history from database.
 */
export async function refreshRecentJobs(): Promise<void> {
  if (!adapter) return;

  jobsState$.loading.set(true);
  try {
    const recent = await adapter.getRecent(undefined, 20);
    jobsState$.recentJobs.set(recent);
  } finally {
    jobsState$.loading.set(false);
  }
}

/**
 * Trigger a job to run immediately.
 */
export async function runJobNow(type: JobType, config: JobsConfig): Promise<void> {
  if (!scheduler) {
    console.warn('[jobActions] Scheduler not initialized');
    return;
  }

  await scheduler.triggerNow(type, config);
}

/**
 * Stop the scheduler.
 */
export function stopScheduler(): void {
  if (scheduler) {
    scheduler.stop();
    jobsState$.schedulerRunning.set(false);
  }
}

/**
 * Restart the scheduler with new config.
 */
export async function restartScheduler(config: JobsConfig): Promise<void> {
  if (scheduler) {
    scheduler.stop();
    await scheduler.start(config);
    jobsState$.schedulerRunning.set(config.enabled);
  }
}

/**
 * Get scheduler status.
 */
export function getSchedulerStatus() {
  return scheduler?.getStatus() ?? [];
}

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_JOBS__ = {
    runJobNow,
    stopScheduler,
    restartScheduler,
    refreshRecentJobs,
    getSchedulerStatus,
  };
}
