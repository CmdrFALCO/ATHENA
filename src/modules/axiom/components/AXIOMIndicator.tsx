/**
 * AXIOMIndicator — Status bar indicator in the app header
 * WP 9A.3: AXIOM Visualization
 *
 * Shows workflow status ("AXIOM: Validating..." / "AXIOM: Idle"),
 * token count summary, and pulsing dot when active.
 * Click opens AXIOMPanel.
 */

import { useSelector } from '@legendapp/state/react';
import { Activity, AlertCircle } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';

interface AXIOMIndicatorProps {
  className?: string;
}

export function AXIOMIndicator({ className }: AXIOMIndicatorProps) {
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const isPaused = useSelector(() => axiomState$.isPaused.get());
  const totalTokens = useSelector(() => axiomState$.totalTokens.get());
  const lastError = useSelector(() => axiomState$.lastError.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());

  // Compute pending count (tokens not in sink places)
  const sinkPlaces = new Set(['P_committed', 'P_rejected']);
  let pendingCount = 0;
  for (const [placeId, tokenIds] of Object.entries(tokensByPlace)) {
    if (!sinkPlaces.has(placeId)) {
      pendingCount += tokenIds.length;
    }
  }

  const getStatusText = () => {
    if (lastError) return 'Error';
    if (isPaused) return 'Paused';
    if (isRunning) return 'Validating...';
    return 'Idle';
  };

  const statusText = getStatusText();

  return (
    <button
      onClick={() => axiomActions.togglePanel()}
      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors
        hover:bg-athena-border ${className ?? ''}`}
      title="Toggle AXIOM Panel (Ctrl+Shift+A)"
    >
      {/* Status dot */}
      <span className="relative flex h-2 w-2">
        {isRunning && !isPaused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            lastError
              ? 'bg-red-500'
              : isRunning && !isPaused
                ? 'bg-blue-500'
                : isPaused
                  ? 'bg-yellow-500'
                  : 'bg-athena-muted'
          }`}
        />
      </span>

      {/* Label */}
      <span className="text-athena-muted font-medium">AXIOM:</span>
      <span className={`${lastError ? 'text-red-400' : 'text-athena-text'}`}>
        {statusText}
      </span>

      {/* Token count */}
      {totalTokens > 0 && (
        <span className="text-athena-muted ml-1">
          {totalTokens} token{totalTokens !== 1 ? 's' : ''}
          {pendingCount > 0 && ` | ${pendingCount} pending`}
        </span>
      )}

      {/* Error badge */}
      {lastError && (
        <AlertCircle className="w-3 h-3 text-red-400 ml-0.5" />
      )}

      {/* Activity icon when running */}
      {isRunning && !lastError && (
        <Activity className="w-3 h-3 text-blue-400 ml-0.5" />
      )}
    </button>
  );
}
