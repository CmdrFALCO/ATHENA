import type { IBackgroundJob, ProgressCallback } from './IBackgroundJob';
import type { JobResult, StaleConnectionConfig } from '../types';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { DatabaseConnection } from '@/database/init';

export class StaleConnectionJob implements IBackgroundJob {
  readonly type = 'stale_connection';

  constructor(
    private db: DatabaseConnection,
    private connectionAdapter: IConnectionAdapter
  ) {}

  async run(
    config: StaleConnectionConfig,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const startTime = Date.now();
    onProgress(10);

    // Find connections pointing to deleted (invalidated) entities
    const staleRows = await this.db.exec<{ id: string; source_id: string; target_id: string }>(
      `SELECT c.id, c.source_id, c.target_id
       FROM connections c
       LEFT JOIN entities es ON c.source_id = es.id AND es.invalid_at IS NULL
       LEFT JOIN entities et ON c.target_id = et.id AND et.invalid_at IS NULL
       WHERE c.invalid_at IS NULL
         AND (es.id IS NULL OR et.id IS NULL)`
    );

    onProgress(40);

    const staleIds = staleRows.map((row) => row.id);

    // Auto-delete if configured
    let deletedCount = 0;
    if (config.autoDelete && staleIds.length > 0) {
      for (let i = 0; i < staleIds.length; i++) {
        await this.connectionAdapter.delete(staleIds[i]);
        deletedCount++;
        onProgress(40 + Math.floor((i / staleIds.length) * 50));
      }
    }

    onProgress(95);

    // Get total connection count
    const countRows = await this.db.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM connections WHERE invalid_at IS NULL`
    );
    const totalConnections = countRows[0]?.count ?? 0;

    onProgress(100);

    return {
      itemsProcessed: totalConnections,
      itemsAffected: staleIds.length,
      durationMs: Date.now() - startTime,
      details: {
        staleConnectionIds: staleIds,
        deleted: config.autoDelete ? deletedCount : 0,
        autoDeleteEnabled: config.autoDelete,
      },
    };
  }
}
