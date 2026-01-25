/**
 * EdgeProposalCard - Single edge proposal card with accept/reject
 * WP 7.5 - Proposal Cards UI
 *
 * Displays a proposed connection with:
 * - Source -> Target visualization
 * - Label and rationale
 * - Confidence score
 * - Dependency tracking for proposed nodes
 * - Accept/Reject buttons
 */

import { useState, useMemo } from 'react';
import { ArrowRight, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import type { EdgeProposal } from '../types';
import { chatActions } from '../store';
import { useAdapters } from '@/adapters/hooks';
import { ProposalAcceptService } from '../services/ProposalAcceptService';

interface EdgeProposalCardProps {
  messageId: string;
  proposal: EdgeProposal;
  /** Map of proposed node titles to their created IDs */
  acceptedNodeIds: Map<string, string>;
}

export function EdgeProposalCard({
  messageId,
  proposal,
  acceptedNodeIds,
}: EdgeProposalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapters = useAdapters();

  // Resolve IDs: check if references point to accepted nodes or existing IDs
  const resolvedFromId = useMemo(() => {
    // First check if it was resolved during extraction
    if (proposal.fromId) return proposal.fromId;
    // Then check if a proposed node with this title was accepted
    return acceptedNodeIds.get(proposal.fromTitle);
  }, [proposal.fromId, proposal.fromTitle, acceptedNodeIds]);

  const resolvedToId = useMemo(() => {
    if (proposal.toId) return proposal.toId;
    return acceptedNodeIds.get(proposal.toTitle);
  }, [proposal.toId, proposal.toTitle, acceptedNodeIds]);

  const canAccept = Boolean(resolvedFromId && resolvedToId);

  // Determine why we can't accept (if applicable)
  const blockReason = useMemo(() => {
    if (canAccept) return null;
    const missing: string[] = [];
    if (!resolvedFromId) missing.push(`"${proposal.fromTitle}"`);
    if (!resolvedToId) missing.push(`"${proposal.toTitle}"`);
    return `Accept the note${missing.length > 1 ? 's' : ''} ${missing.join(' and ')} first`;
  }, [canAccept, resolvedFromId, resolvedToId, proposal.fromTitle, proposal.toTitle]);

  const handleAccept = async () => {
    if (!canAccept || !resolvedFromId || !resolvedToId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const acceptService = new ProposalAcceptService(adapters);
      const result = await acceptService.acceptEdge({
        ...proposal,
        fromId: resolvedFromId,
        toId: resolvedToId,
      });

      chatActions.updateProposalStatus(messageId, proposal.id, 'accepted');

      if (result.validationWarnings.length > 0) {
        console.log('Validation warnings:', result.validationWarnings);
      }
    } catch (err) {
      console.error('Failed to accept edge proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    chatActions.updateProposalStatus(messageId, proposal.id, 'rejected');
  };

  if (proposal.status !== 'pending') {
    return null;
  }

  return (
    <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 transition-opacity">
      <div className="flex items-start gap-2">
        <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Connection visualization */}
          <div className="font-medium text-sm text-blue-900 dark:text-blue-100 flex items-center gap-1 flex-wrap">
            <span className={!resolvedFromId ? 'text-amber-600' : ''}>
              {proposal.fromTitle}
            </span>
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            <span className={!resolvedToId ? 'text-amber-600' : ''}>
              {proposal.toTitle}
            </span>
          </div>

          {/* Label and rationale */}
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            <span className="font-medium">{proposal.label}</span>
            {proposal.rationale && (
              <span className="text-blue-600 dark:text-blue-400"> — {proposal.rationale}</span>
            )}
          </div>

          {/* Warning for missing nodes */}
          {!canAccept && blockReason && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
              <AlertTriangle className="w-3 h-3" />
              <span>{blockReason}</span>
            </div>
          )}

          {/* Error display */}
          {error && <div className="text-xs text-red-600 mt-2">Warning: {error}</div>}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-blue-600">
              {Math.round(proposal.confidence * 100)}% confidence
            </span>

            <div className="flex gap-1">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                title="Reject this suggestion"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing || !canAccept}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                title={canAccept ? 'Accept and create connection' : blockReason || 'Cannot accept'}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
