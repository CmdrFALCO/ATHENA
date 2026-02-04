/**
 * ReviewCard — Individual review item card with actions
 * WP 9B.4
 *
 * Shows entity/connection preview, confidence badge, queue reason,
 * expandable confidence breakdown, and approve/reject/edit actions.
 */

import { useState } from 'react';
import {
  Check,
  X as XIcon,
  Pencil,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Clock,
} from 'lucide-react';
import type { ReviewQueueItem } from '../../autonomous/review/types';
import type { ReviewQueueReason } from '../../events/types';
import type { ConfidenceResult, ConfidenceFactors, ConfidenceExplanation } from '../../autonomous/confidence/types';
import type { InvarianceEvidence } from '../../autonomous/invariance/types';
import { InvarianceBadge } from '../InvarianceBadge';
import { formatRelativeTime } from '@/shared/utils/formatTime';

interface ReviewCardProps {
  item: ReviewQueueItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onEditAndApprove: (id: string, edits: { title?: string; description?: string }) => void;
  /** WP 9B.5: Invariance evidence for the connection (if available) */
  invarianceEvidence?: InvarianceEvidence | null;
  /** WP 9B.5: Whether to highlight fragile connections */
  highlightFragile?: boolean;
}

// --- Confidence display helpers (shared with ProposalCards) ---

const FACTOR_ORDER: (keyof ConfidenceFactors)[] = [
  'validationScore', 'critiqueSurvival', 'noveltyScore',
  'graphCoherence', 'embeddingSimilarity', 'sourceQuality',
  'extractionClarity', 'invarianceScore',
];

const FACTOR_SHORT_LABELS: Record<keyof ConfidenceFactors, string> = {
  validationScore: 'Validation',
  critiqueSurvival: 'Critique',
  noveltyScore: 'Novelty',
  graphCoherence: 'Graph Fit',
  embeddingSimilarity: 'Semantic',
  sourceQuality: 'Source',
  extractionClarity: 'Extraction',
  invarianceScore: 'Invariance',
};

function getBarColor(score: number | null): string {
  if (score === null) return 'bg-athena-border/40';
  if (score >= 0.7) return 'bg-emerald-500';
  if (score >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConfidenceBadgeColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 0.5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
}

const REASON_LABELS: Record<ReviewQueueReason, string> = {
  low_confidence: 'Low Confidence',
  floor_veto: 'Floor Veto',
  validation_failed: 'Validation Failed',
  rate_limited: 'Rate Limited',
  scope_restricted: 'Scope Restricted',
};

const REASON_COLORS: Record<ReviewQueueReason, string> = {
  low_confidence: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  floor_veto: 'text-red-400 bg-red-500/10 border-red-500/30',
  validation_failed: 'text-red-400 bg-red-500/10 border-red-500/30',
  rate_limited: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  scope_restricted: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

function ConfidenceBreakdownInline({ result }: { result: ConfidenceResult }) {
  const notableExplanations = result.explanations.filter(
    (e) => e.severity === 'warning' || e.severity === 'critical',
  );

  return (
    <div className="space-y-1 mt-2 p-2 bg-athena-bg/50 border border-athena-border rounded">
      {FACTOR_ORDER.map((factor) => {
        const score = result.factors[factor];
        const isNull = score === null;
        const barWidth = isNull ? 0 : Math.round((score as number) * 100);
        const barColor = getBarColor(score);
        const isVeto = result.vetoFactors.includes(factor);

        return (
          <div
            key={factor}
            className={`flex items-center gap-2 ${isVeto ? 'ring-1 ring-red-500/50 rounded px-1 -mx-1' : ''}`}
          >
            <span className="text-[10px] text-athena-muted w-16 shrink-0 text-right">
              {FACTOR_SHORT_LABELS[factor]}
            </span>
            <div className="flex-1 h-1.5 bg-athena-border/30 rounded-full overflow-hidden">
              {isNull ? (
                <div className="h-full w-full bg-athena-border/20" />
              ) : (
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              )}
            </div>
            <span className="text-[10px] text-athena-muted w-10 text-right tabular-nums">
              {isNull ? 'N/A' : `${barWidth}%`}
            </span>
            {isVeto && (
              <span className="text-[9px] text-red-400 font-medium">VETO</span>
            )}
          </div>
        );
      })}

      {/* Aggregate */}
      <div className="flex items-center gap-2 pt-1 border-t border-athena-border/30">
        <span className="text-[10px] font-medium text-athena-text w-16 shrink-0 text-right">
          Aggregate
        </span>
        <div className="flex-1 h-1.5 bg-athena-border/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(result.score)}`}
            style={{ width: `${Math.round(result.score * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-athena-text w-10 text-right tabular-nums">
          {Math.round(result.score * 100)}%
        </span>
      </div>

      {result.hasFloorVeto && (
        <div className="text-[10px] text-red-400 mt-1">
          Forced review: {result.vetoFactors.map((f) => FACTOR_SHORT_LABELS[f]).join(', ')} below minimum
        </div>
      )}

      {notableExplanations.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {notableExplanations.map((exp) => (
            <div
              key={exp.factor}
              className={`text-[10px] ${exp.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}
            >
              {exp.explanation}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewCard({
  item,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onEditAndApprove,
  invarianceEvidence,
  highlightFragile = false,
}: ReviewCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const { provenance, confidenceResult, queueReason, queuedAt } = item;
  const isEntity = provenance.target_type === 'entity';

  const handleApprove = () => {
    setIsAnimatingOut(true);
    setTimeout(() => onApprove(provenance.id), 200);
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setIsAnimatingOut(true);
    setTimeout(() => onReject(provenance.id, rejectReason || undefined), 200);
  };

  const handleEditAndApprove = () => {
    if (!showEdit) {
      setShowEdit(true);
      return;
    }
    setIsAnimatingOut(true);
    setTimeout(
      () =>
        onEditAndApprove(provenance.id, {
          title: editTitle || undefined,
          description: editDescription || undefined,
        }),
      200,
    );
  };

  return (
    <div
      className={`border rounded-lg p-3 transition-all duration-200 ${
        isAnimatingOut ? 'opacity-0 translate-x-4' : 'opacity-100'
      } ${isSelected ? 'ring-1 ring-blue-500/50' : ''} ${
        highlightFragile && invarianceEvidence?.robustnessLabel === 'fragile'
          ? 'border-red-500/40'
          : 'border-athena-border'
      }`}
    >
      {/* Top row: checkbox, icon, title, confidence, provenance id */}
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <label className="flex items-center mt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(provenance.id)}
            className="w-3.5 h-3.5 rounded border-athena-border bg-athena-surface
              text-blue-500 focus:ring-blue-500/50 focus:ring-1 cursor-pointer"
          />
        </label>

        {/* Entity/Connection icon */}
        {isEntity ? (
          <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <Link2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        )}

        {/* Title / target info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-athena-text truncate">
              {provenance.target_id}
            </span>

            {/* Confidence badge */}
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded border tabular-nums ${getConfidenceBadgeColor(
                provenance.confidence,
              )}`}
            >
              {Math.round(provenance.confidence * 100)}%
            </span>

            {/* WP 9B.5: Invariance badge */}
            <InvarianceBadge
              evidence={invarianceEvidence ?? null}
              showFailureModes={true}
              compact
            />
          </div>

          {/* Queue reason and timestamp */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${REASON_COLORS[queueReason]}`}
            >
              {REASON_LABELS[queueReason]}
            </span>

            <span className="flex items-center gap-0.5 text-[10px] text-athena-muted">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(queuedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable confidence breakdown */}
      {confidenceResult && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 mt-2 text-[10px] text-athena-muted hover:text-athena-text transition-colors"
          >
            {showBreakdown ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Confidence Breakdown
          </button>

          {showBreakdown && (
            <ConfidenceBreakdownInline result={confidenceResult} />
          )}
        </>
      )}

      {/* Reject reason input (shown when reject is clicked) */}
      {showRejectInput && (
        <div className="mt-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full text-[11px] px-2 py-1 bg-athena-surface border border-athena-border
              rounded text-athena-text placeholder:text-athena-muted/50
              focus:outline-none focus:ring-1 focus:ring-red-500/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReject();
              if (e.key === 'Escape') setShowRejectInput(false);
            }}
            autoFocus
          />
        </div>
      )}

      {/* Edit fields (shown when edit & accept is clicked) */}
      {showEdit && (
        <div className="mt-2 space-y-1.5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="New title"
            className="w-full text-[11px] px-2 py-1 bg-athena-surface border border-athena-border
              rounded text-athena-text placeholder:text-athena-muted/50
              focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            autoFocus
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="New description"
            className="w-full text-[11px] px-2 py-1 bg-athena-surface border border-athena-border
              rounded text-athena-text placeholder:text-athena-muted/50
              focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-2">
        <button
          onClick={handleApprove}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
            text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded
            hover:bg-emerald-500/20 transition-colors"
        >
          <Check className="w-3 h-3" />
          Accept
        </button>

        <button
          onClick={handleReject}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
            text-red-400 bg-red-500/10 border border-red-500/30 rounded
            hover:bg-red-500/20 transition-colors"
        >
          <XIcon className="w-3 h-3" />
          {showRejectInput ? 'Confirm Reject' : 'Reject'}
        </button>

        <button
          onClick={handleEditAndApprove}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
            text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded
            hover:bg-blue-500/20 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          {showEdit ? 'Save & Accept' : 'Edit & Accept'}
        </button>
      </div>
    </div>
  );
}
