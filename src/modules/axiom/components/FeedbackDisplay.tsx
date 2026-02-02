/**
 * FeedbackDisplay — Structured corrective feedback view
 * WP 9A.3: AXIOM Visualization
 *
 * Displays CorrectionFeedback[] in a readable format with
 * constraint info, severity badges, actual/expected values,
 * and optional suggestions.
 */

import { AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import type { CorrectionFeedback } from '../types/feedback';

interface FeedbackDisplayProps {
  feedback: CorrectionFeedback[];
  compact?: boolean;
}

function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const colors = {
    1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    3: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${colors[level]}`}>
      L{level}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: 'error' | 'warning' }) {
  if (severity === 'error') {
    return (
      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded border bg-red-500/20 text-red-400 border-red-500/30">
        <AlertCircle className="w-2.5 h-2.5" />
        error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
      <AlertTriangle className="w-2.5 h-2.5" />
      warning
    </span>
  );
}

export function FeedbackDisplay({ feedback, compact }: FeedbackDisplayProps) {
  if (feedback.length === 0) {
    return (
      <div className="text-xs text-athena-muted italic px-2 py-3">
        No feedback recorded.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {feedback.map((item, idx) => (
        <div
          key={`${item.ruleId}-${item.attemptNumber}-${idx}`}
          className="rounded border border-athena-border bg-athena-surface/50 p-2.5"
        >
          {/* Header row: badges + rule ID */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <LevelBadge level={item.level} />
            <SeverityBadge severity={item.severity} />
            <code className="text-[10px] text-athena-muted font-mono">{item.ruleId}</code>
          </div>

          {/* Message */}
          <p className="mt-1.5 text-xs text-athena-text">{item.message}</p>

          {/* Constraint description */}
          {!compact && item.constraint && (
            <p className="mt-1 text-[11px] text-athena-muted">
              Constraint: {item.constraint}
            </p>
          )}

          {/* Actual / Expected */}
          {!compact && (item.actual !== undefined || item.expected !== undefined) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              {item.actual !== undefined && (
                <div>
                  <span className="text-athena-muted block mb-0.5">Actual:</span>
                  <code className="block px-1.5 py-1 rounded bg-red-500/10 text-red-300 font-mono text-[10px] break-all">
                    {typeof item.actual === 'string'
                      ? item.actual
                      : JSON.stringify(item.actual, null, 1)}
                  </code>
                </div>
              )}
              {item.expected !== undefined && (
                <div>
                  <span className="text-athena-muted block mb-0.5">Expected:</span>
                  <code className="block px-1.5 py-1 rounded bg-green-500/10 text-green-300 font-mono text-[10px] break-all">
                    {typeof item.expected === 'string'
                      ? item.expected
                      : JSON.stringify(item.expected, null, 1)}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Suggestion */}
          {item.suggestion && (
            <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/20">
              <Lightbulb className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-[11px]">
                <span className="text-blue-400 font-medium">{item.suggestion.action}:</span>{' '}
                <span className="text-athena-text">{item.suggestion.details}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
