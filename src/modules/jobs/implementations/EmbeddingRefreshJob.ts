import type { IBackgroundJob, ProgressCallback } from './IBackgroundJob';
import type { JobResult, EmbeddingRefreshConfig } from '../types';
import type { IndexerService } from '@/modules/ai/IndexerService';
import type { DatabaseConnection } from '@/database/init';

export class EmbeddingRefreshJob implements IBackgroundJob {
  readonly type = 'embedding_refresh';

  constructor(
    private db: DatabaseConnection,
    private indexerService: IndexerService | null
  ) {}

  async run(
    config: EmbeddingRefreshConfig,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const startTime = Date.now();
    onProgress(5);

    if (!this.indexerService) {
      return {
        itemsProcessed: 0,
        itemsAffected: 0,
        durationMs: Date.now() - startTime,
        details: { message: 'IndexerService not available' },
      };
    }

    // Find notes without embeddings
    const notesToEmbed = await this.db.exec<{ id: string; title: string }>(
      `SELECT e.id, e.title
       FROM entities e
       LEFT JOIN embeddings emb ON e.id = emb.entity_id
       WHERE e.type = 'note'
         AND e.invalid_at IS NULL
         AND emb.id IS NULL
       LIMIT ?`,
      [config.batchSize]
    );

    if (notesToEmbed.length === 0) {
      onProgress(100);
      return {
        itemsProcessed: 0,
        itemsAffected: 0,
        durationMs: Date.now() - startTime,
        details: { message: 'No notes missing embeddings' },
      };
    }

    onProgress(20);

    // Index each note using existing IndexerService
    let indexed = 0;
    let failed = 0;

    for (let i = 0; i < notesToEmbed.length; i++) {
      try {
        const success = await this.indexerService.indexNote(notesToEmbed[i].id);
        if (success) {
          indexed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.warn(`[EmbeddingRefresh] Failed to index ${notesToEmbed[i].id}:`, error);
        failed++;
      }

      onProgress(20 + Math.floor(((i + 1) / notesToEmbed.length) * 80));
    }

    // Count remaining
    const remainingRows = await this.db.exec<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM entities e
       LEFT JOIN embeddings emb ON e.id = emb.entity_id
       WHERE e.type = 'note' AND e.invalid_at IS NULL AND emb.id IS NULL`
    );
    const remaining = remainingRows[0]?.count ?? 0;

    return {
      itemsProcessed: notesToEmbed.length,
      itemsAffected: indexed,
      durationMs: Date.now() - startTime,
      details: {
        indexed,
        failed,
        remaining,
      },
    };
  }
}
