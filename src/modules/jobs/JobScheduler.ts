import type { JobType, JobsConfig, JobConfig } from './types';
import type { JobRunner } from './JobRunner';
import type { IJobAdapter } from './adapters/JobAdapter';

interface ScheduledJob {
  type: JobType;
  intervalMs: number;
  timeoutId?: ReturnType<typeof setTimeout>;
  lastRun?: string;
}

export class JobScheduler {
  private schedules: Map<JobType, ScheduledJob> = new Map();
  private started = false;

  constructor(
    private runner: JobRunner,
    private jobAdapter: IJobAdapter
  ) {}

  /**
   * Start the scheduler with the given configuration.
   */
  async start(config: JobsConfig): Promise<void> {
    if (!config.enabled) {
      console.log('[JobScheduler] Jobs disabled globally');
      return;
    }

    if (this.started) {
      console.warn('[JobScheduler] Already started');
      return;
    }

    this.started = true;
    console.log('[JobScheduler] Starting...');

    // Schedule each enabled job type
    const jobConfigs: Array<{ type: JobType; config: JobConfig }> = [
      { type: 'similarity_scan', config: config.similarityScan },
      { type: 'orphan_detection', config: config.orphanDetection },
      { type: 'stale_connection', config: config.staleConnection },
      { type: 'embedding_refresh', config: config.embeddingRefresh },
      { type: 'validation_sweep', config: config.validationSweep },
    ];

    for (const { type, config: jobConfig } of jobConfigs) {
      if (jobConfig.enabled) {
        await this.scheduleJob(type, jobConfig);
      }
    }

    console.log(`[JobScheduler] Scheduled ${this.schedules.size} job types`);
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.timeoutId) {
        clearTimeout(schedule.timeoutId);
      }
    }
    this.schedules.clear();
    this.started = false;
    console.log('[JobScheduler] Stopped');
  }

  /**
   * Trigger a job to run immediately (outside of schedule).
   */
  async triggerNow(type: JobType, config: JobsConfig): Promise<void> {
    const jobConfig = this.getConfigForType(type, config);
    if (!jobConfig) {
      console.warn(`[JobScheduler] No config for job type: ${type}`);
      return;
    }

    if (this.runner.isRunning(type)) {
      console.log(`[JobScheduler] Job ${type} already running, skipping`);
      return;
    }

    await this.runner.runJob(type, jobConfig);
  }

  private async scheduleJob(type: JobType, config: JobConfig): Promise<void> {
    const intervalMs = config.intervalHours * 60 * 60 * 1000;

    // Check when job last ran
    const lastRun = await this.jobAdapter.getLastRun(type);
    const lastRunTime = lastRun?.completedAt ? new Date(lastRun.completedAt).getTime() : 0;
    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;

    // Calculate delay until next run
    let delayMs: number;
    if (timeSinceLastRun >= intervalMs) {
      // Overdue - run after a short staggered delay (0-30 seconds)
      delayMs = Math.random() * 30000;
    } else {
      // Schedule for remaining interval
      delayMs = intervalMs - timeSinceLastRun;
    }

    const schedule: ScheduledJob = {
      type,
      intervalMs,
      lastRun: lastRun?.completedAt,
    };

    this.schedules.set(type, schedule);
    this.scheduleNextRun(type, config, delayMs);

    console.log(`[JobScheduler] Scheduled ${type} — next run in ${Math.round(delayMs / 1000 / 60)} minutes`);
  }

  private scheduleNextRun(type: JobType, config: JobConfig, delayMs: number): void {
    const schedule = this.schedules.get(type);
    if (!schedule) return;

    schedule.timeoutId = setTimeout(async () => {
      if (!this.started) return;

      try {
        if (!this.runner.isRunning(type)) {
          await this.runner.runJob(type, config);
          schedule.lastRun = new Date().toISOString();
        }
      } catch (error) {
        console.error(`[JobScheduler] Error running ${type}:`, error);
      }

      // Schedule next run
      if (this.started) {
        this.scheduleNextRun(type, config, schedule.intervalMs);
      }
    }, delayMs);
  }

  private getConfigForType(type: JobType, config: JobsConfig): JobConfig | null {
    switch (type) {
      case 'similarity_scan': return config.similarityScan;
      case 'orphan_detection': return config.orphanDetection;
      case 'stale_connection': return config.staleConnection;
      case 'embedding_refresh': return config.embeddingRefresh;
      case 'validation_sweep': return config.validationSweep;
      default: return null;
    }
  }

  /**
   * Get scheduler status for debugging.
   */
  getStatus(): { type: JobType; intervalHours: number; lastRun?: string }[] {
    return Array.from(this.schedules.entries()).map(([type, schedule]) => ({
      type,
      intervalHours: schedule.intervalMs / (60 * 60 * 1000),
      lastRun: schedule.lastRun,
    }));
  }
}
