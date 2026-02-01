import type { IBackgroundJob, ProgressCallback } from './IBackgroundJob';
import type { JobResult, SimilarityScanConfig } from '../types';
import type { SimilarityService } from '@/modules/similarity';

export class SimilarityScanJob implements IBackgroundJob {
  readonly type = 'similarity_scan';

  constructor(
    private similarityService: SimilarityService
  ) {}

  async run(
    config: SimilarityScanConfig,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const startTime = Date.now();

    // Sync config before scanning
    this.similarityService.updateConfig({
      threshold: config.threshold,
      weights: undefined!, // keep existing weights
    });

    // Use existing scanAll from WP 8.1
    const result = await this.similarityService.scanAll((progress) => {
      if (progress.totalNotes > 0) {
        const pct = Math.floor((progress.notesScanned / progress.totalNotes) * 100);
        onProgress(pct);
      }
    });

    return {
      itemsProcessed: result.totalNotes,
      itemsAffected: result.candidatesFound,
      durationMs: Date.now() - startTime,
      details: {
        status: result.status,
        notesScanned: result.notesScanned,
      },
    };
  }
}
