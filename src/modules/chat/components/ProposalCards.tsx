/**
 * ProposalCards - Container for all proposals in a message
 * WP 7.5 - Proposal Cards UI
 *
 * Renders node proposals first (green cards), then edge proposals (blue cards).
 * Manages shared state for tracking accepted node IDs used by edge dependency resolution.
 */

import { useCallback, useState, useMemo } from 'react';
import { Lightbulb, Swords, Loader2 } from 'lucide-react';
import type { KnowledgeProposals } from '../types';
import { NodeProposalCard } from './NodeProposalCard';
import { EdgeProposalCard } from './EdgeProposalCard';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';
import { useCritiqueResult } from '@/modules/axiom/hooks/useCritiqueResult';
import { CritiqueSection } from '@/modules/axiom/components/CritiqueSection';

interface ProposalCardsProps {
  messageId: string;
  proposals: KnowledgeProposals;
}

export function ProposalCards({ messageId, proposals }: ProposalCardsProps) {
  // Track accepted node IDs as state so edge cards re-render when nodes are accepted
  // Uses Record<title, noteId> format for efficient lookup
  const [acceptedNodeIds, setAcceptedNodeIds] = useState<Record<string, string>>({});

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
    !isBeingCritiqued;

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs text-athena-muted font-medium flex items-center gap-1">
        <Lightbulb className="w-3 h-3 text-amber-500" />
        <span>Suggested additions to your knowledge graph:</span>
        {/* WP 9B.1: Challenge button */}
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

      {/* Render node proposals first */}
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

      {/* WP 9B.1: Devil's Advocate critique section */}
      {showCritiqueSection && (
        <CritiqueSection result={critiqueResult} />
      )}
    </div>
  );
}
