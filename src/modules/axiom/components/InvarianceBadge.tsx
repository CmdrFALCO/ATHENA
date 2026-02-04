/**
 * InvarianceBadge — Compact robustness indicator
 * WP 9B.5
 *
 * Shows structural invariance status at a glance:
 * - robust (green), moderate (yellow), fragile (red), untested (gray)
 * Tooltip with details on hover.
 */

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldQuestion, ShieldCheck } from 'lucide-react';
import type { RobustnessLabel, InvarianceEvidence } from '../autonomous/invariance/types';
import { formatRelativeTime } from '@/shared/utils/formatTime';

interface InvarianceBadgeProps {
  evidence: InvarianceEvidence | null;
  /** Show failure modes in tooltip */
  showFailureModes?: boolean;
  /** Compact mode: just icon + label, no percentage */
  compact?: boolean;
}

const LABEL_CONFIG: Record<
  RobustnessLabel,
  {
    text: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    Icon: typeof Shield;
  }
> = {
  robust: {
    text: 'Robust',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    Icon: ShieldCheck,
  },
  moderate: {
    text: 'Moderate',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    Icon: Shield,
  },
  fragile: {
    text: 'Fragile',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    Icon: ShieldAlert,
  },
  untested: {
    text: '?',
    bgClass: 'bg-athena-border/10',
    textClass: 'text-athena-muted',
    borderClass: 'border-athena-border/30',
    Icon: ShieldQuestion,
  },
};

export function InvarianceBadge({
  evidence,
  showFailureModes = true,
  compact = false,
}: InvarianceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const label = evidence?.robustnessLabel ?? 'untested';
  const config = LABEL_CONFIG[label];
  const { Icon } = config;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded border
          ${config.bgClass} ${config.textClass} ${config.borderClass}`}
      >
        <Icon className="w-3 h-3" />
        {compact ? (
          config.text
        ) : evidence && label !== 'untested' ? (
          `${Math.round(evidence.invarianceScore * 100)}%`
        ) : (
          config.text
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5
            w-56 p-2 rounded-lg shadow-lg border border-athena-border bg-athena-surface"
        >
          <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${config.textClass}`}>
                {config.text}
              </span>
              {evidence && label !== 'untested' && (
                <span className="text-[10px] text-athena-muted tabular-nums">
                  {Math.round(evidence.invarianceScore * 100)}%
                </span>
              )}
            </div>

            {/* Test details */}
            {evidence && label !== 'untested' && (
              <>
                {evidence.paraphrase?.tested && (
                  <div className="text-[10px] text-athena-muted">
                    Paraphrase: {Math.round(evidence.paraphrase.survivalRate * 100)}% survival
                    ({evidence.paraphrase.pairCount} pairs)
                  </div>
                )}
                {evidence.compression?.tested && (
                  <div className="text-[10px] text-athena-muted">
                    Compression: {evidence.compression.interpretation.replace(/_/g, ' ')}
                    {evidence.compression.survives &&
                      ` (survives at ${Math.round(evidence.compression.lowestSurvivingLevel * 100)}%)`}
                  </div>
                )}
              </>
            )}

            {/* Failure modes */}
            {showFailureModes &&
              evidence &&
              evidence.failureModes.length > 0 && (
                <div className="space-y-0.5 pt-1 border-t border-athena-border/30">
                  {evidence.failureModes.map((mode, i) => (
                    <div key={i} className="text-[10px] text-red-400">
                      {mode}
                    </div>
                  ))}
                </div>
              )}

            {/* Timestamp */}
            {evidence && (
              <div className="text-[9px] text-athena-muted/60 pt-0.5">
                Tested {formatRelativeTime(evidence.testedAt)}
              </div>
            )}

            {!evidence && (
              <div className="text-[10px] text-athena-muted">
                Not yet tested. Click "Test Robustness" to check.
              </div>
            )}
          </div>

          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
              w-0 h-0 border-l-4 border-r-4 border-t-4
              border-transparent border-t-athena-border"
          />
        </div>
      )}
    </div>
  );
}
