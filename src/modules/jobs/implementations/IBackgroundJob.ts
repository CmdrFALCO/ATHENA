import type { JobResult, JobConfig } from '../types';

export type ProgressCallback = (progress: number) => void;

export interface IBackgroundJob {
  readonly type: string;

  run(config: JobConfig, onProgress: ProgressCallback): Promise<JobResult>;

  cancel?(): void;
}
