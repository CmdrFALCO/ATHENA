import type { DatabaseConnection } from '@/database/init';
import type { BackgroundJob, JobType, JobResult, JobStatus } from '../types';

export interface IJobAdapter {
  create(job: Omit<BackgroundJob, 'id'>): Promise<BackgroundJob>;
  update(id: string, updates: Partial<BackgroundJob>): Promise<void>;
  getById(id: string): Promise<BackgroundJob | null>;
  getRecent(type?: JobType, limit?: number): Promise<BackgroundJob[]>;
  getRunning(): Promise<BackgroundJob[]>;
  getLastRun(type: JobType): Promise<BackgroundJob | null>;
  deleteOlderThan(days: number): Promise<number>;
}

interface JobRow {
  id: string;
  type: string;
  status: string;
  progress: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  items_processed: number | null;
  items_affected: number | null;
  duration_ms: number | null;
  details: string | null;
  error: string | null;
}

export class SQLiteJobAdapter implements IJobAdapter {
  constructor(private db: DatabaseConnection) {}

  async create(job: Omit<BackgroundJob, 'id'>): Promise<BackgroundJob> {
    const id = crypto.randomUUID();

    await this.db.run(
      `INSERT INTO job_history (id, type, status, progress, scheduled_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, job.type, job.status, job.progress, job.scheduledAt]
    );

    return { id, ...job };
  }

  async update(id: string, updates: Partial<BackgroundJob>): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      sets.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.startedAt !== undefined) {
      sets.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      sets.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.result !== undefined) {
      sets.push('items_processed = ?');
      values.push(updates.result.itemsProcessed);
      sets.push('items_affected = ?');
      values.push(updates.result.itemsAffected);
      sets.push('duration_ms = ?');
      values.push(updates.result.durationMs);
      sets.push('details = ?');
      values.push(JSON.stringify(updates.result.details));
    }
    if (updates.error !== undefined) {
      sets.push('error = ?');
      values.push(updates.error);
    }

    if (sets.length === 0) return;

    values.push(id);
    await this.db.run(
      `UPDATE job_history SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
  }

  async getById(id: string): Promise<BackgroundJob | null> {
    const rows = await this.db.exec<JobRow>(
      `SELECT * FROM job_history WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    return this.rowToJob(rows[0]);
  }

  async getRecent(type?: JobType, limit: number = 20): Promise<BackgroundJob[]> {
    const rows = type
      ? await this.db.exec<JobRow>(
          `SELECT * FROM job_history WHERE type = ? ORDER BY scheduled_at DESC LIMIT ?`,
          [type, limit]
        )
      : await this.db.exec<JobRow>(
          `SELECT * FROM job_history ORDER BY scheduled_at DESC LIMIT ?`,
          [limit]
        );

    return rows.map((row) => this.rowToJob(row));
  }

  async getRunning(): Promise<BackgroundJob[]> {
    const rows = await this.db.exec<JobRow>(
      `SELECT * FROM job_history WHERE status = 'running'`
    );

    return rows.map((row) => this.rowToJob(row));
  }

  async getLastRun(type: JobType): Promise<BackgroundJob | null> {
    const rows = await this.db.exec<JobRow>(
      `SELECT * FROM job_history
       WHERE type = ? AND status IN ('completed', 'failed')
       ORDER BY completed_at DESC LIMIT 1`,
      [type]
    );

    if (rows.length === 0) return null;
    return this.rowToJob(rows[0]);
  }

  async deleteOlderThan(days: number): Promise<number> {
    const before = new Date();
    before.setDate(before.getDate() - days);

    // Count before deleting
    const countRows = await this.db.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM job_history WHERE scheduled_at < ?`,
      [before.toISOString()]
    );
    const count = countRows[0]?.count ?? 0;

    await this.db.run(
      `DELETE FROM job_history WHERE scheduled_at < ?`,
      [before.toISOString()]
    );

    return count;
  }

  private rowToJob(row: JobRow): BackgroundJob {
    const job: BackgroundJob = {
      id: row.id,
      type: row.type as JobType,
      status: row.status as JobStatus,
      progress: row.progress,
      scheduledAt: row.scheduled_at,
    };

    if (row.started_at) job.startedAt = row.started_at;
    if (row.completed_at) job.completedAt = row.completed_at;
    if (row.error) job.error = row.error;

    if (row.items_processed !== null) {
      job.result = {
        itemsProcessed: row.items_processed,
        itemsAffected: row.items_affected ?? 0,
        durationMs: row.duration_ms ?? 0,
        details: row.details ? JSON.parse(row.details) : {},
      };
    }

    return job;
  }
}
