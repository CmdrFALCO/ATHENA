import type { BackgroundJob, JobType, JobConfig, JobEvent, JobEventHandler } from './types';
import type { IJobAdapter } from './adapters/JobAdapter';
import type { IBackgroundJob } from './implementations/IBackgroundJob';

export class JobRunner {
  private handlers: Set<JobEventHandler> = new Set();
  private runningJobs: Map<string, BackgroundJob> = new Map();

  constructor(
    private jobAdapter: IJobAdapter,
    private jobImplementations: Map<JobType, IBackgroundJob>
  ) {}

  /**
   * Subscribe to job events.
   * Returns an unsubscribe function.
   */
  subscribe(handler: JobEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: JobEvent): void {
    this.handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[JobRunner] Event handler error:', error);
      }
    });
  }

  /**
   * Run a job immediately.
   */
  async runJob(type: JobType, config: JobConfig): Promise<BackgroundJob> {
    const implementation = this.jobImplementations.get(type);
    if (!implementation) {
      throw new Error(`No implementation for job type: ${type}`);
    }

    // Create job record
    const job = await this.jobAdapter.create({
      type,
      status: 'pending',
      progress: 0,
      scheduledAt: new Date().toISOString(),
    });

    this.runningJobs.set(job.id, job);

    try {
      // Mark as running
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      await this.jobAdapter.update(job.id, {
        status: 'running',
        startedAt: job.startedAt,
      });
      this.emit({ type: 'started', job: { ...job } });

      // Execute with progress tracking
      const result = await implementation.run(config, (progress) => {
        job.progress = progress;
        this.emit({ type: 'progress', job: { ...job } });
        // Don't await DB update for progress (too frequent)
      });

      // Mark as completed
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      job.result = result;

      await this.jobAdapter.update(job.id, {
        status: 'completed',
        progress: 100,
        completedAt: job.completedAt,
        result,
      });

      this.emit({ type: 'completed', job: { ...job } });
    } catch (error) {
      // Mark as failed
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = error instanceof Error ? error.message : String(error);

      await this.jobAdapter.update(job.id, {
        status: 'failed',
        completedAt: job.completedAt,
        error: job.error,
      });

      this.emit({ type: 'failed', job: { ...job } });
      console.error(`[JobRunner] Job ${type} failed:`, error);
    } finally {
      this.runningJobs.delete(job.id);
    }

    return job;
  }

  /**
   * Check if a job type is currently running.
   */
  isRunning(type: JobType): boolean {
    for (const job of this.runningJobs.values()) {
      if (job.type === type) return true;
    }
    return false;
  }

  /**
   * Get all currently running jobs.
   */
  getRunningJobs(): BackgroundJob[] {
    return Array.from(this.runningJobs.values());
  }
}
