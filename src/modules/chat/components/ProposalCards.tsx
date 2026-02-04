/**
 * ProposalCards - Container for all proposals in a message
 * WP 7.5 - Proposal Cards UI
 * WP 9B.2 - Autonomous mode support (auto-committed / queued / auto-rejected states)
 * WP 9B.3 - Multi-factor confidence breakdown display
 *
 * Renders node proposals first (green cards), then edge proposals (blue cards).
 * Manages shared state for tracking accepted node IDs used by edge dependency resolution.
 */

import { useCallback, useState, useMemo } from 'react';
import { Lightbulb, Swords, Loader2, Check, AlertTriangle, Undo2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { KnowledgeProposals } from '../types';
import { NodeProposalCard } from './NodeProposalCard';
import { EdgeProposalCard } from './EdgeProposalCard';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';
import { useCritiqueResult } from '@/modules/axiom/hooks/useCritiqueResult';
import { CritiqueSection } from '@/modules/axiom/components/CritiqueSection';
import type { AutonomousDecision } from '@/modules/axiom/autonomous/types';
import type { ConfidenceResult, ConfidenceFactors, ConfidenceExplanation } from '@/modules/axiom/autonomous/confidence/types';

interface ProposalCardsProps {
  messageId: string;
  proposals: KnowledgeProposals;
  /** WP 9B.2: Autonomous decision for this proposal batch */
  autonomousDecision?: AutonomousDecision;
  /** WP 9B.2: Callback to revert an auto-committed proposal */
  onRevert?: (provenanceId: string) => void;
  /** WP 9B.2: Callback to manually accept an auto-rejected proposal */
  onOverrideAccept?: () => void;
}

// === WP 9B.3: Confidence Breakdown Components ===

/** Factor display order (most important first) */
const FACTOR_ORDER: (keyof ConfidenceFactors)[] = [
  'validationScore', 'critiqueSurvival', 'noveltyScore',
  'graphCoherence', 'embeddingSimilarity', 'sourceQuality',
  'extractionClarity', 'invarianceScore',
];

/** Short labels for the factor bars */
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

function FactorBar({
  factor,
  score,
  explanation,
  isVeto,
}: {
  factor: keyof ConfidenceFactors;
  score: number | null;
  explanation?: ConfidenceExplanation;
  isVeto: boolean;
}) {
  const label = FACTOR_SHORT_LABELS[factor];
  const isNull = score === null;
  const barWidth = isNull ? 0 : Math.round(score * 100);
  const barColor = getBarColor(score);

  return (
    <div className={`flex items-center gap-2 ${isVeto ? 'ring-1 ring-red-500/50 rounded px-1 -mx-1' : ''}`}>
      <span className="text-[10px] text-athena-muted w-16 shrink-0 text-right">
        {label}
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
}

function ConfidenceBreakdown({
  result,
}: {
  result: ConfidenceResult;
}) {
  // Filter explanations to only warnings and criticals
  const notableExplanations = result.explanations.filter(
    (e) => e.severity === 'warning' || e.severity === 'critical',
  );

  return (
    <div className="space-y-1.5">
      {FACTOR_ORDER.map((factor) => (
        <FactorBar
          key={factor}
          factor={factor}
          score={result.factors[factor]}
          explanation={result.explanations.find((e) => e.factor === factor)}
          isVeto={result.vetoFactors.includes(factor)}
        />
      ))}

      {/* Aggregate score */}
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

      {/* Floor veto notice */}
      {result.hasFloorVeto && (
        <div className="text-[10px] text-red-400 mt-1">
          Forced review: {result.vetoFactors.map((f) => FACTOR_SHORT_LABELS[f]).join(', ')} below minimum threshold
        </div>
      )}

      {/* Notable explanations */}
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

// === Main Component ===

export function ProposalCards({
  messageId,
  proposals,
  autonomousDecision,
  onRevert,
  onOverrideAccept,
}: ProposalCardsProps) {
  // Track accepted node IDs as state so edge cards re-render when nodes are accepted
  // Uses Record<title, noteId> format for efficient lookup
  const [acceptedNodeIds, setAcceptedNodeIds] = useState<Record<string, string>>({});
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false);

  // Convert to Map for EdgeProposalCard compatibility
  const acceptedNodeIdsMap = useMemo(() => new Map(Object.entries(acceptedNodeIds)), [acceptedNodeIds]);

  // Get minimum confidence threshold from settings
  const minConfidence = useSelector(() =>
    devSettings$.chat.extraction.minConfidenceThreshold.get()
  );

  // WP 9B.1: Critique settings
  const critiqueUIConfig = useSelector(() => devSettings$.axiom.critique.ui.get());
  const critiqueEnabled = useSelector(() => devSettings$.axiom.critique.enabled.get());

  // WP 9B.1: Get critique result for this proposal batch (uses messageId as correlationId)
  const { critiqueResult, critiqueSkipped, isBeingCritiqued } = useCritiqueResult(messageId);

  // WP 9B.2: Autonomous mode state
  const isAutoCommitted = autonomousDecision?.action === 'auto_commit';
  const isQueuedForReview = autonomousDecision?.action === 'queue_for_review';
  const isAutoRejected = autonomousDecision?.action === 'auto_reject';
  const isRateLimited = autonomousDecision?.action === 'rate_limited';

  // WP 9B.3: Multi-factor confidence result
  const confidenceResult = autonomousDecision?.confidenceResult;

  // Filter proposals by confidence and status
  const pendingNodes = proposals.nodes.filter(
    (n) => n.status === 'pending' && n.confidence >= minConfidence
  );
  const pendingEdges = proposals.edges.filter(
    (e) => e.status === 'pending' && e.confidence >= minConfidence
  );

  // Callback when a node is accepted - updates the shared state
  const handleNodeAccepted = useCallback((title: string, noteId: string) => {
    setAcceptedNodeIds((prev) => ({ ...prev, [title]: noteId }));
  }, []);

  if (pendingNodes.length === 0 && pendingEdges.length === 0) {
    return null;
  }

  const showCritiqueSection = critiqueUIConfig.showInProposalCard && critiqueResult;
  const showChallengeButton =
    critiqueEnabled &&
    critiqueUIConfig.allowManualCritique &&
    !critiqueResult &&
    !critiqueSkipped &&
    !isBeingCritiqued &&
    !isAutoCommitted; // Don't show challenge on already-committed proposals

  return (
    <div className="mt-3 space-y-2">
      {/* Header with autonomous status badges */}
      <div className="text-xs text-athena-muted font-medium flex items-center gap-1">
        <Lightbulb className="w-3 h-3 text-amber-500" />
        <span>Suggested additions to your knowledge graph:</span>

        {/* WP 9B.2: Auto-committed badge */}
        {isAutoCommitted && (
          <span className="ml-auto flex items-center gap-1">
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
              text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded">
              <Check className="w-3 h-3" />
              Auto-committed ({(autonomousDecision.confidence * 100).toFixed(0)}%)
            </span>
            {onRevert && autonomousDecision.provenance_id && (
              <button
                onClick={() => onRevert(autonomousDecision.provenance_id!)}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
                  text-athena-muted hover:text-red-400 border border-athena-border rounded
                  hover:border-red-500/30 transition-colors"
                title="Revert this auto-commit"
              >
                <Undo2 className="w-3 h-3" />
                Revert
              </button>
            )}
          </span>
        )}

        {/* WP 9B.2: Queued for review badge */}
        {(isQueuedForReview || isRateLimited) && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
            text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <AlertTriangle className="w-3 h-3" />
            {isRateLimited ? 'Rate limited' : 'Queued for review'}
          </span>
        )}

        {/* WP 9B.2: Auto-rejected badge */}
        {isAutoRejected && (
          <span className="ml-auto flex items-center gap-1">
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
              text-athena-muted bg-athena-border/30 border border-athena-border rounded">
              Auto-rejected
            </span>
            {onOverrideAccept && (
              <button
                onClick={onOverrideAccept}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
                  text-blue-400 border border-blue-500/30 rounded
                  hover:bg-blue-500/10 transition-colors"
                title="Override: Accept this proposal anyway"
              >
                Override: Accept
              </button>
            )}
          </span>
        )}

        {/* WP 9B.1: Challenge button (not shown for auto-committed) */}
        {showChallengeButton && (
          <button
            className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium
              text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/10 transition-colors"
            title="Run Devil's Advocate critique on these proposals"
          >
            <Swords className="w-3 h-3" />
            Challenge
          </button>
        )}
        {/* WP 9B.1: Critiquing indicator */}
        {isBeingCritiqued && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Critiquing...
          </span>
        )}
      </div>

      {/* WP 9B.3: Confidence details (expandable) — shows multi-factor breakdown when available */}
      {autonomousDecision && autonomousDecision.action !== 'disabled' && (
        <button
          onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
          className="flex items-center gap-1 text-[10px] text-athena-muted hover:text-athena-text transition-colors"
        >
          <Zap className="w-3 h-3" />
          <span>
            {confidenceResult ? 'Confidence Details' : autonomousDecision.reason}
            {' '}({(autonomousDecision.confidence * 100).toFixed(0)}%)
          </span>
          {showConfidenceDetails ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}

      {showConfidenceDetails && autonomousDecision && (
        <div className="bg-athena-bg/50 border border-athena-border rounded p-2 text-[10px] text-athena-muted space-y-1">
          {confidenceResult ? (
            /* WP 9B.3: Multi-factor breakdown */
            <ConfidenceBreakdown result={confidenceResult} />
          ) : (
            /* WP 9B.2 fallback: Simple factor display */
            <>
              <div className="flex justify-between">
                <span>Proposal confidence:</span>
                <span>{(autonomousDecision.factors.proposalConfidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Validation score:</span>
                <span>{(autonomousDecision.factors.validationScore * 100).toFixed(0)}%</span>
              </div>
              {autonomousDecision.factors.critiqueSurvival !== null && (
                <div className="flex justify-between">
                  <span>Critique survival:</span>
                  <span>{(autonomousDecision.factors.critiqueSurvival * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Novelty score:</span>
                <span>{(autonomousDecision.factors.noveltyScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between font-medium text-athena-text">
                <span>Aggregate:</span>
                <span>{(autonomousDecision.confidence * 100).toFixed(0)}%</span>
              </div>
            </>
          )}
          {autonomousDecision.provenance_id && (
            <div className="flex justify-between text-athena-muted/60 pt-1 border-t border-athena-border/30">
              <span>Provenance:</span>
              <span className="font-mono">{autonomousDecision.provenance_id}</span>
            </div>
          )}
        </div>
      )}

      {/* Render node proposals (auto-rejected = collapsed/grayed) */}
      <div className={isAutoRejected ? 'opacity-40' : ''}>
        {pendingNodes.map((node) => (
          <NodeProposalCard
            key={node.id}
            messageId={messageId}
            proposal={node}
            onAccepted={(noteId) => handleNodeAccepted(node.title, noteId)}
          />
        ))}

        {/* Render edge proposals after nodes */}
        {pendingEdges.map((edge) => (
          <EdgeProposalCard
            key={edge.id}
            messageId={messageId}
            proposal={edge}
            acceptedNodeIds={acceptedNodeIdsMap}
          />
        ))}
      </div>

      {/* WP 9B.1: Devil's Advocate critique section */}
      {showCritiqueSection && (
        <CritiqueSection result={critiqueResult} />
      )}
    </div>
  );
}
