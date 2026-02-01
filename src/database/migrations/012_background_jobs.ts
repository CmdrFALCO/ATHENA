import type { DatabaseConnection } from '../init';

/**
 * Migration 012: Create job_history table (WP 8.6)
 *
 * Stores background job execution history for scheduled maintenance tasks
 * (similarity scan, orphan detection, stale connection cleanup, etc.).
 */
export async function setupBackgroundJobs(db: DatabaseConnection): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS job_history (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,

      scheduled_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,

      items_processed INTEGER,
      items_affected INTEGER,
      duration_ms INTEGER,
      details TEXT,
      error TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Index for querying recent jobs by type
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_job_history_type_date
    ON job_history(type, scheduled_at DESC)
  `);

  // Index for finding running jobs
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_job_history_status
    ON job_history(status)
  `);

  console.log('[Migration] job_history table ready');
}
