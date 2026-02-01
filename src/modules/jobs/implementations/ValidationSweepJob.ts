import type { IBackgroundJob, ProgressCallback } from './IBackgroundJob';
import type { JobResult, ValidationSweepConfig } from '../types';
import { runValidation } from '@/modules/validation';

export class ValidationSweepJob implements IBackgroundJob {
  readonly type = 'validation_sweep';

  async run(
    _config: ValidationSweepConfig,
    onProgress: ProgressCallback
  ): Promise<JobResult> {
    const startTime = Date.now();
    onProgress(10);

    // Use existing validation service from WP 5
    const report = await runValidation({ scope: 'full' });

    onProgress(100);

    return {
      itemsProcessed: report.summary.entitiesChecked + report.summary.connectionsChecked,
      itemsAffected: report.violations.length,
      durationMs: Date.now() - startTime,
      details: {
        entitiesChecked: report.summary.entitiesChecked,
        connectionsChecked: report.summary.connectionsChecked,
        clustersChecked: report.summary.clustersChecked,
        errors: report.summary.errors,
        warnings: report.summary.warnings,
        conforms: report.conforms,
        rulesRun: report.rulesRun,
      },
    };
  }
}
