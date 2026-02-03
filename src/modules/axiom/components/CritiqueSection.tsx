/**
 * CritiqueSection — Devil's Advocate critique display
 * WP 9B.1: Devil's Advocate
 *
 * Renders survival score bar, counter-arguments, blind spots,
 * risk factors, and human override buttons inside ProposalCards.
 *
 * Uses amber/orange theme to distinguish from green (nodes) and blue (edges).
 */

import { useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import type { CRITIQUE_RESULT, CounterArgument, RiskFactor } from '../types/critique';
import { devSettings$ } from '@/config/devSettings';

interface CritiqueSectionProps {
  result: CRITIQUE_RESULT;
  onAcceptAnyway?: () => void;
  onRejectAfterReview?: () => void;
}

// --- Helper Components ---

function SurvivalBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const { color, label, icon } = getSurvivalTheme(score);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-athena-muted">Survival Score</span>
        <span className={`font-medium ${color}`}>
          {icon} {percentage}% — {label}
        </span>
      </div>
      <div className="w-full h-2 bg-athena-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CounterArgumentItem({ arg }: { arg: CounterArgument }) {
  const severityConfig = {
    major: { icon: <XCircle className="w-3 h-3 text-red-400" />, label: 'MAJOR', color: 'text-red-400' },
    moderate: { icon: <AlertTriangle className="w-3 h-3 text-yellow-400" />, label: 'MODERATE', color: 'text-yellow-400' },
    minor: { icon: <CheckCircle className="w-3 h-3 text-green-400" />, label: 'MINOR', color: 'text-green-400' },
  };

  const config = severityConfig[arg.severity];

  return (
    <div className="flex gap-2 py-1.5 border-b border-athena-border/50 last:border-0">
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-medium ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[10px] text-athena-muted truncate">
            {arg.targetLabel}
          </span>
          <span className="text-[10px] text-athena-muted ml-auto flex-shrink-0">
            {Math.round(arg.survivalScore * 100)}%
          </span>
        </div>
        <p className="text-xs text-athena-text">{arg.argument}</p>
      </div>
    </div>
  );
}

function RiskFactorItem({ factor }: { factor: RiskFactor }) {
  const severityColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded border ${severityColors[factor.severity]}`}
      >
        {factor.category}
      </span>
      <span className="text-xs text-athena-text">{factor.description}</span>
    </div>
  );
}

// --- Theme Helpers ---

function getSurvivalTheme(score: number) {
  if (score >= 0.7) return { color: 'text-green-400', label: 'Proceed', icon: '\u2705' };
  if (score >= 0.5) return { color: 'text-yellow-400', label: 'Reconsider', icon: '\u26A0\uFE0F' };
  if (score >= 0.3) return { color: 'text-orange-400', label: 'Weak', icon: '\u26A0\uFE0F' };
  return { color: 'text-red-400', label: 'Reject', icon: '\u274C' };
}

function getBarColor(score: number) {
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  if (score >= 0.3) return 'bg-orange-500';
  return 'bg-red-500';
}

// --- Main Component ---

export function CritiqueSection({
  result,
  onAcceptAnyway,
  onRejectAfterReview,
}: CritiqueSectionProps) {
  const collapseWhenSurvived = useSelector(() =>
    devSettings$.axiom.critique.ui.collapseWhenSurvived.get(),
  );
  const allowHumanOverride = useSelector(() =>
    devSettings$.axiom.critique.ui.allowHumanOverride.get(),
  );
  const showSurvivalScore = useSelector(() =>
    devSettings$.axiom.critique.ui.showSurvivalScore.get(),
  );

  // Collapse by default when survived and config says so
  const defaultCollapsed = result.survived && collapseWhenSurvived;
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="border border-amber-500/30 rounded-lg overflow-hidden bg-amber-950/20">
      {/* Header — always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-amber-500/10 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        )}
        <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="font-medium text-amber-400">Devil&apos;s Advocate</span>

        {/* Inline summary when collapsed */}
        {showSurvivalScore && (
          <span className={`ml-auto text-[10px] font-medium ${getSurvivalTheme(result.survivalScore).color}`}>
            {Math.round(result.survivalScore * 100)}% survival
          </span>
        )}
        {result.counterArguments.length > 0 && (
          <span className="text-[10px] text-athena-muted">
            {result.counterArguments.length} issue{result.counterArguments.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expandable content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3 border-t border-amber-500/20">
          {/* Survival score bar */}
          {showSurvivalScore && (
            <div className="pt-2">
              <SurvivalBar score={result.survivalScore} />
            </div>
          )}

          {/* Adjusted confidence */}
          <div className="flex items-center gap-2 text-xs">
            <Eye className="w-3 h-3 text-athena-muted" />
            <span className="text-athena-muted">Adjusted Confidence:</span>
            <span className="font-medium text-athena-text">
              {result.adjustedConfidence}
            </span>
          </div>

          {/* Counter-arguments */}
          {result.counterArguments.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-athena-muted mb-1 uppercase tracking-wider">
                Counter-Arguments
              </div>
              <div className="space-y-0">
                {result.counterArguments.map((arg, i) => (
                  <CounterArgumentItem key={`${arg.targetId}-${i}`} arg={arg} />
                ))}
              </div>
            </div>
          )}

          {/* Blind spots */}
          {result.blindSpots.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-athena-muted mb-1 uppercase tracking-wider">
                Blind Spots
              </div>
              <ul className="space-y-1">
                {result.blindSpots.map((spot, i) => (
                  <li key={i} className="text-xs text-athena-text flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">&#x2022;</span>
                    {spot}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk factors */}
          {result.riskFactors.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-athena-muted mb-1 uppercase tracking-wider">
                Risk Factors
              </div>
              <div className="space-y-1">
                {result.riskFactors.map((factor, i) => (
                  <RiskFactorItem key={i} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Human override buttons */}
          {allowHumanOverride && (onAcceptAnyway || onRejectAfterReview) && (
            <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
              {onAcceptAnyway && (
                <button
                  onClick={onAcceptAnyway}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded
                    text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  Accept Anyway
                </button>
              )}
              {onRejectAfterReview && (
                <button
                  onClick={onRejectAfterReview}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded
                    text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="text-[10px] text-athena-muted pt-1 border-t border-amber-500/10">
            {result.scope} critique via {result.critiqueModel || 'default model'}
            {result.durationMs > 0 && ` in ${(result.durationMs / 1000).toFixed(1)}s`}
          </div>
        </div>
      )}
    </div>
  );
}
