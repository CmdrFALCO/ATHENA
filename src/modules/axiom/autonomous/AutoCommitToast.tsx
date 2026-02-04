/**
 * AutoCommitToast — Notification for autonomous auto-commits
 * WP 9B.2
 *
 * Shows a brief toast when a proposal is auto-committed.
 * Includes undo button for quick revert.
 * Auto-dismisses after 5 seconds.
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, X, Undo2 } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { autonomousState$ } from './autonomousState';
import { devSettings$ } from '@/config/devSettings';
import type { AutonomousDecision } from './types';

interface ToastEntry {
  id: string;
  decision: AutonomousDecision;
  timestamp: number;
}

/**
 * Renders floating toast notifications for auto-committed proposals.
 * Mount once at the app root level.
 */
export function AutoCommitToastContainer({
  onRevert,
}: {
  onRevert?: (provenanceId: string) => void;
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const showNotifications = useSelector(() =>
    devSettings$.axiom.autonomous.ui.showNotifications.get(),
  );
  const recentDecisions = useSelector(() =>
    autonomousState$.recentDecisions.get(),
  );

  // Watch for new auto-commit decisions
  useEffect(() => {
    if (!showNotifications) return;
    if (recentDecisions.length === 0) return;

    const latest = recentDecisions[0];
    if (latest?.action !== 'auto_commit' || !latest.provenance_id) return;

    // Only show toast if we haven't shown it already
    setToasts((prev) => {
      if (prev.some((t) => t.id === latest.provenance_id)) return prev;
      return [
        ...prev,
        {
          id: latest.provenance_id!,
          decision: latest,
          timestamp: Date.now(),
        },
      ];
    });
  }, [recentDecisions, showNotifications]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.timestamp < 5000));
    }, 1000);

    return () => clearInterval(timer);
  }, [toasts.length]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleRevert = useCallback(
    (id: string) => {
      onRevert?.(id);
      dismiss(id);
    },
    [onRevert, dismiss],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-athena-panel border border-cyan-500/30
            rounded-lg shadow-lg text-xs text-athena-text animate-in slide-in-from-right duration-200"
        >
          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="flex-1 min-w-0 truncate">
            Auto-committed ({(toast.decision.confidence * 100).toFixed(0)}%)
          </span>

          {onRevert && (
            <button
              onClick={() => handleRevert(toast.id)}
              className="shrink-0 p-1 text-athena-muted hover:text-red-400 transition-colors"
              title="Undo"
            >
              <Undo2 className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 p-1 text-athena-muted hover:text-athena-text transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
