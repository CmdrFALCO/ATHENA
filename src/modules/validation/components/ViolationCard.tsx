/**
 * ViolationCard - Individual violation card with actions
 * WP 5.6: Validation Panel UI
 */

import { AlertCircle, AlertTriangle, Eye, Wrench, X } from 'lucide-react';
import { ATHENA_COLORS } from '@/shared/theme/colors';
import type { Violation } from '../types';

interface ViolationCardProps {
  violation: Violation;
  entityTitle?: string; // Title of the affected entity
  onShow: () => void;
  onFix?: () => void; // Only if auto-fixable
  onDismiss: () => void;
}

export function ViolationCard({
  violation,
  entityTitle,
  onShow,
  onFix,
  onDismiss,
}: ViolationCardProps) {
  const isError = violation.severity === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;
  const color = isError
    ? ATHENA_COLORS.validation.error
    : ATHENA_COLORS.validation.warning;

  return (
    <div className="p-3 bg-athena-surface/50 rounded-lg border border-athena-border">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          {/* Rule name / entity title */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-athena-text truncate">
              {entityTitle || violation.focusId}
            </span>
          </div>

          {/* Violation message */}
          <p className="text-sm text-athena-muted mt-1">{violation.message}</p>

          {/* Suggestion */}
          {violation.suggestion && (
            <p className="text-xs text-athena-muted mt-1.5 flex items-center gap-1">
              <span className="text-amber-400">Tip:</span>
              {violation.suggestion.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 ml-6">
        <button
          onClick={onShow}
          className="flex items-center gap-1 px-2 py-1 text-xs
                     bg-athena-border text-athena-muted rounded
                     hover:text-athena-text hover:bg-athena-border/80
                     transition-colors"
        >
          <Eye className="w-3 h-3" />
          Show
        </button>

        {violation.suggestion?.autoApplicable && onFix && (
          <button
            onClick={onFix}
            className="flex items-center gap-1 px-2 py-1 text-xs
                       bg-blue-500/20 text-blue-400 rounded
                       hover:bg-blue-500/30 transition-colors"
          >
            <Wrench className="w-3 h-3" />
            Fix
          </button>
        )}

        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-2 py-1 text-xs
                     bg-athena-border text-athena-muted rounded
                     hover:text-red-400 hover:bg-red-500/10
                     transition-colors"
        >
          <X className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
