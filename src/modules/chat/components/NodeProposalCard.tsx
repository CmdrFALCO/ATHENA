/**
 * NodeProposalCard - Single node proposal card with accept/reject
 * WP 7.5 - Proposal Cards UI
 *
 * Displays a proposed note with:
 * - Title and content preview
 * - Suggested connections
 * - Confidence score
 * - Accept/Reject buttons
 */

import { useState } from 'react';
import { FileText, Link, Check, X, Loader2 } from 'lucide-react';
import type { NodeProposal } from '../types';
import { chatActions } from '../store';
import { useAdapters } from '@/adapters/hooks';
import { ProposalAcceptService } from '../services/ProposalAcceptService';

interface NodeProposalCardProps {
  messageId: string;
  proposal: NodeProposal;
  onAccepted?: (createdNoteId: string) => void;
}

export function NodeProposalCard({ messageId, proposal, onAccepted }: NodeProposalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapters = useAdapters();

  const handleAccept = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const acceptService = new ProposalAcceptService(adapters);
      const result = await acceptService.acceptNode(proposal);

      // Update proposal status in chat state
      chatActions.updateProposalStatus(messageId, proposal.id, 'accepted');

      // Notify parent of created ID (for edge dependency resolution)
      onAccepted?.(result.noteId);

      // Show validation warnings if any
      if (result.validationWarnings.length > 0) {
        console.log('Validation warnings:', result.validationWarnings);
        // TODO: Could show a toast or inline warning
      }
    } catch (err) {
      console.error('Failed to accept node proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    chatActions.updateProposalStatus(messageId, proposal.id, 'rejected');
  };

  // Don't render if already processed
  if (proposal.status !== 'pending') {
    return null;
  }

  return (
    <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 transition-opacity">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="font-medium text-sm text-green-900 dark:text-green-100">
            {proposal.title}
          </div>

          {/* Content preview */}
          <div className="text-xs text-green-700 dark:text-green-300 mt-1 line-clamp-2">
            {proposal.content}
          </div>

          {/* Suggested connections */}
          {proposal.suggestedConnections.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <Link className="w-3 h-3" />
              <span className="truncate">
                Connect to: {proposal.suggestedConnections.slice(0, 3).join(', ')}
                {proposal.suggestedConnections.length > 3 &&
                  ` +${proposal.suggestedConnections.length - 3} more`}
              </span>
            </div>
          )}

          {/* Error display */}
          {error && <div className="text-xs text-red-600 mt-2">Warning: {error}</div>}

          {/* Footer: confidence + actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-green-600">
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
                disabled={isProcessing}
                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                title="Accept and create note"
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
