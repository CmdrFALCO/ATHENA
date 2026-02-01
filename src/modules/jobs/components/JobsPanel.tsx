import { useSelector } from '@legendapp/state/react';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  Link2Off,
  FileText,
  ShieldCheck,
  Unlink,
} from 'lucide-react';
import { jobsState$ } from '../store/jobState';
import { runJobNow } from '../store/jobActions';
import { JobProgress } from './JobProgress';
import type { JobType, JobsConfig, BackgroundJob } from '../types';
import { formatRelativeTime } from '@/shared/utils/formatTime';
import { devSettings$ } from '@/config/devSettings';

const JOB_ICONS: Record<JobType, React.ElementType> = {
  similarity_scan: Search,
  orphan_detection: Unlink,
  stale_connection: Link2Off,
  embedding_refresh: FileText,
  validation_sweep: ShieldCheck,
};

const JOB_LABELS: Record<JobType, string> = {
  similarity_scan: 'Similarity Scan',
  orphan_detection: 'Orphan Detection',
  stale_connection: 'Stale Connections',
  embedding_refresh: 'Embedding Refresh',
  validation_sweep: 'Validation Sweep',
};

export function JobsPanel() {
  const runningJobs = useSelector(jobsState$.runningJobs);
  const recentJobs = useSelector(jobsState$.recentJobs);
  const schedulerRunning = useSelector(jobsState$.schedulerRunning);
  const lastResults = useSelector(jobsState$.lastResults);
  const jobsConfig = useSelector(devSettings$.jobs) as JobsConfig | undefined;

  const handleRunNow = async (type: JobType) => {
    if (!jobsConfig) return;
    await runJobNow(type, jobsConfig);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-athena-text">Background Jobs</h2>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${schedulerRunning ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-athena-muted">
            {schedulerRunning ? 'Scheduler Active' : 'Scheduler Stopped'}
          </span>
        </div>
      </div>

      {/* Running Jobs */}
      {runningJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-athena-muted">Running</h3>
          {runningJobs.map((job) => (
            <JobProgress key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Job Types Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-athena-muted">Job Types</h3>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(JOB_LABELS) as JobType[]).map((type) => {
            const Icon = JOB_ICONS[type];
            const lastResult = lastResults[type];
            const isRunning = runningJobs.some((j) => j.type === type);

            return (
              <div
                key={type}
                className="flex items-center justify-between p-3 rounded-lg bg-athena-surface border border-athena-border"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-athena-muted" />
                  <div>
                    <div className="text-sm font-medium text-athena-text">
                      {JOB_LABELS[type]}
                    </div>
                    {lastResult && (
                      <div className="text-xs text-athena-muted">
                        {lastResult.success ? (
                          <span className="text-green-400">
                            {lastResult.itemsAffected} affected &middot; {formatRelativeTime(lastResult.completedAt)}
                          </span>
                        ) : (
                          <span className="text-red-400">
                            Failed &middot; {formatRelativeTime(lastResult.completedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRunNow(type)}
                  disabled={isRunning}
                  className="p-2 rounded hover:bg-athena-border disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRunning ? 'Job running...' : 'Run now'}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 text-athena-muted animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 text-athena-muted" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent History */}
      {recentJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-athena-muted">Recent History</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {recentJobs.slice(0, 10).map((job) => (
              <JobHistoryItem key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobHistoryItem({ job }: { job: BackgroundJob }) {
  const Icon = JOB_ICONS[job.type];

  return (
    <div className="flex items-center gap-3 p-2 rounded text-sm">
      <Icon className="w-4 h-4 text-athena-muted flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-athena-text">{JOB_LABELS[job.type]}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {job.status === 'completed' ? (
          <>
            <span className="text-xs text-athena-muted">
              {job.result?.itemsAffected ?? 0} affected
            </span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </>
        ) : job.status === 'failed' ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Clock className="w-4 h-4 text-athena-muted" />
        )}
      </div>
    </div>
  );
}
