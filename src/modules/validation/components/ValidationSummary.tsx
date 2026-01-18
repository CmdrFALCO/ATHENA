/**
 * ValidationSummary - Header section showing validation status
 * WP 5.6: Validation Panel UI
 */

import {
  Shield,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useValidation } from '../hooks';
import { formatRelativeTime } from '@/shared/utils';

export function ValidationSummary() {
  const {
    isValidating,
    lastValidatedAt,
    errorCount,
    warningCount,
    runValidation,
  } = useValidation();

  const totalCount = errorCount + warningCount;
  const hasIssues = totalCount > 0;

  return (
    <div className="p-4 border-b border-athena-border">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-athena-muted" />
          <h2 className="font-medium text-athena-text">Validation</h2>
        </div>

        <button
          onClick={() => runValidation()}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                     bg-blue-500/20 text-blue-400 rounded-md
                     hover:bg-blue-500/30 disabled:opacity-50
                     transition-colors"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run
            </>
          )}
        </button>
      </div>

      {/* Status row */}
      <div className="text-sm text-athena-muted">
        {lastValidatedAt ? (
          <span>Last run: {formatRelativeTime(lastValidatedAt)}</span>
        ) : (
          <span>Not yet run</span>
        )}
      </div>

      {/* Counts row */}
      {lastValidatedAt && (
        <div className="flex items-center gap-4 mt-2">
          {!hasIssues ? (
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">All clear</span>
            </div>
          ) : (
            <>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {warningCount} warning{warningCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
