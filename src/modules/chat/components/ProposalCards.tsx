/**
 * ProposalCards - Container for all proposals in a message
 * WP 7.5 - Proposal Cards UI
 *
 * Renders node proposals first (green cards), then edge proposals (blue cards).
 * Manages shared state for tracking accepted node IDs used by edge dependency resolution.
 */

import { useCallback, useState, useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import type { KnowledgeProposals } from '../types';
import { NodeProposalCard } from './NodeProposalCard';
import { EdgeProposalCard } from './EdgeProposalCard';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config/devSettings';

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

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs text-athena-muted font-medium flex items-center gap-1">
        <Lightbulb className="w-3 h-3 text-amber-500" />
        <span>Suggested additions to your knowledge graph:</span>
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
    </div>
  );
}
