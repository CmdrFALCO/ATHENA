/**
 * InterventionModal — Human escalation modal
 * WP 9A.3: AXIOM Visualization
 *
 * Appears when a token reaches the escalation threshold and requires
 * human decision: Accept Anyway, Edit & Retry, or Reject.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from '@legendapp/state/react';
import { AlertTriangle, Check, RotateCcw, X } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import { FeedbackDisplay } from './FeedbackDisplay';
import type { AetherToken } from '../types/token';
import type { CorrectionFeedback } from '../types/feedback';

interface InterventionModalProps {
  token?: AetherToken;
  feedback?: CorrectionFeedback[];
  onAccept?: () => void;
  onRetry?: () => void;
  onReject?: () => void;
}

export function InterventionModal({
  token,
  feedback,
  onAccept,
  onRetry,
  onReject,
}: InterventionModalProps) {
  const interventionPending = useSelector(() => axiomState$.interventionPending.get());

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!interventionPending) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        axiomActions.setInterventionPending(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interventionPending]);

  if (!interventionPending) return null;

  const displayFeedback = feedback ?? token?.feedbackHistory ?? [];
  const retryCount = token?.retryCount ?? 0;
  const maxRetries = token?.maxRetries ?? 3;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => axiomActions.setInterventionPending(false)}
      />

      {/* Modal */}
      <div className="relative w-[520px] max-h-[80vh] bg-athena-bg border border-athena-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-athena-border bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-athena-text">
              Human Intervention Required
            </h3>
            <p className="text-xs text-athena-muted mt-0.5">
              This proposal has exceeded automatic retry limits ({retryCount}/{maxRetries}).
              Please review and decide how to proceed.
            </p>
          </div>
          <button
            onClick={() => axiomActions.setInterventionPending(false)}
            className="p-1 rounded hover:bg-athena-surface text-athena-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Token summary */}
        {token && (
          <div className="px-5 py-3 border-b border-athena-border bg-athena-surface/30">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-athena-muted block">Token ID</span>
                <code className="text-athena-text font-mono text-[10px]">
                  {token._meta.id.slice(0, 12)}...
                </code>
              </div>
              <div>
                <span className="text-athena-muted block">Retries</span>
                <span className="text-athena-text">{retryCount} / {maxRetries}</span>
              </div>
              <div>
                <span className="text-athena-muted block">Current Place</span>
                <span className="text-athena-text">{token._meta.currentPlace}</span>
              </div>
            </div>
          </div>
        )}

        {/* Accumulated feedback */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h4 className="text-xs font-medium text-athena-text mb-2">
            Accumulated Feedback ({displayFeedback.length} issue{displayFeedback.length !== 1 ? 's' : ''})
          </h4>
          <FeedbackDisplay feedback={displayFeedback} />
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-athena-border flex items-center gap-2">
          <button
            onClick={() => {
              onAccept?.();
              axiomActions.setInterventionPending(false);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded
              bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Accept Anyway
          </button>

          <button
            onClick={() => {
              onRetry?.();
              axiomActions.setInterventionPending(false);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded
              bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Edit & Retry
          </button>

          <button
            onClick={() => {
              onReject?.();
              axiomActions.setInterventionPending(false);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded
              bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="px-5 py-2 border-t border-athena-border text-[10px] text-athena-muted">
          Press <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded">Esc</kbd> to dismiss without action
        </div>
      </div>
    </div>,
    document.body,
  );
}
