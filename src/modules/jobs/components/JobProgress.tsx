import { Loader2 } from 'lucide-react';
import type { BackgroundJob, JobType } from '../types';

const JOB_LABELS: Record<JobType, string> = {
  similarity_scan: 'Similarity Scan',
  orphan_detection: 'Orphan Detection',
  stale_connection: 'Stale Connections',
  embedding_refresh: 'Embedding Refresh',
  validation_sweep: 'Validation Sweep',
};

interface JobProgressProps {
  job: BackgroundJob;
}

export function JobProgress({ job }: JobProgressProps) {
  return (
    <div className="p-3 rounded-lg bg-athena-surface border border-athena-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm font-medium text-athena-text">
            {JOB_LABELS[job.type]}
          </span>
        </div>
        <span className="text-xs text-athena-muted">
          {job.progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-athena-border rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${job.progress}%` }}
        />
      </div>
    </div>
  );
}
