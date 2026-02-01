import type { IBackgroundJob, ProgressCallback } from './IBackgroundJob';
import type { JobResult, OrphanDetectionConfig } from '../types';
import type { DatabaseConnection } from '@/database/init';

export class OrphanDetectionJob implements IBackgroundJob {
  readonly type = 'orphan_detection';

  constructor(private db: DatabaseConnection) {}

  async run(
    config: OrphanDetectionConfig,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const startTime = Date.now();
    onProgress(10);

    // Find notes with no connections that are older than minAgeDays
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - config.minAgeDays);

    const orphans = await this.db.exec<{ id: string; title: string; created_at: string }>(
      `SELECT e.id, e.title, e.created_at
       FROM entities e
       LEFT JOIN connections c ON (e.id = c.source_id OR e.id = c.target_id)
         AND c.invalid_at IS NULL
       WHERE c.id IS NULL
         AND e.type = 'note'
         AND e.invalid_at IS NULL
         AND e.created_at < ?
       ORDER BY e.created_at ASC`,
      [minDate.toISOString()]
    );

    onProgress(60);

    const orphanIds = orphans.map((row) => row.id);

    // Get total note count for stats
    const countRows = await this.db.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM entities WHERE type = 'note' AND invalid_at IS NULL`
    );
    const totalNotes = countRows[0]?.count ?? 0;

    onProgress(100);

    return {
      itemsProcessed: totalNotes,
      itemsAffected: orphanIds.length,
      durationMs: Date.now() - startTime,
      details: {
        orphanNoteIds: orphanIds,
        minAgeDays: config.minAgeDays,
      },
    };
  }
}
