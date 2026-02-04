/**
 * AXIOMIndicator — Status bar indicator in the app header
 * WP 9A.3: AXIOM Visualization
 * WP 9B.2: Autonomous mode badge + counter
 *
 * Shows workflow status ("AXIOM: Validating..." / "AXIOM: Idle"),
 * token count summary, and pulsing dot when active.
 * Click opens AXIOMPanel.
 */

import { useSelector } from '@legendapp/state/react';
import { Activity, AlertCircle, Swords, Zap } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import { PLACE_IDS } from '../workflows/types';
import { devSettings$ } from '@/config/devSettings';
import { autonomousState$ } from '../autonomous/autonomousState';

interface AXIOMIndicatorProps {
  className?: string;
}

export function AXIOMIndicator({ className }: AXIOMIndicatorProps) {
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const isPaused = useSelector(() => axiomState$.isPaused.get());
  const totalTokens = useSelector(() => axiomState$.totalTokens.get());
  const lastError = useSelector(() => axiomState$.lastError.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());

  // WP 9B.2: Autonomous mode state
  const autonomousEnabled = useSelector(() => devSettings$.axiom.autonomous.enabled.get());
  const autonomousPaused = useSelector(() => autonomousState$.isPaused.get());
  const autonomousPauseReason = useSelector(() => autonomousState$.pauseReason.get());
  const autoCommitsToday = useSelector(() => autonomousState$.autoCommitsToday.get());

  // Compute pending count (tokens not in sink places)
  const sinkPlaces = new Set(['P_committed', 'P_rejected', 'P_escalated']);
  let pendingCount = 0;
  for (const [placeId, tokenIds] of Object.entries(tokensByPlace)) {
    if (!sinkPlaces.has(placeId)) {
      pendingCount += tokenIds.length;
    }
  }

  // WP 9B.1: Detect critiquing state
  const isCritiquing =
    (tokensByPlace[PLACE_IDS.P_verified]?.length ?? 0) > 0 ||
    (tokensByPlace[PLACE_IDS.P_critiqued]?.length ?? 0) > 0;

  const getStatusText = () => {
    if (lastError) return 'Error';
    if (isPaused) return 'Paused';
    if (isCritiquing) return 'Critiquing...';
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
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
            isCritiquing ? 'bg-amber-400' : 'bg-blue-400'
          } opacity-75`} />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            lastError
              ? 'bg-red-500'
              : isCritiquing
                ? 'bg-amber-500'
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

      {/* WP 9B.2: Autonomous mode badge */}
      {autonomousEnabled && (
        <span
          className={`ml-1 flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${
            autonomousPaused
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-cyan-500/20 text-cyan-400'
          }`}
          title={
            autonomousPaused
              ? `Autonomous paused: ${autonomousPauseReason}`
              : `Autonomous mode active (${autoCommitsToday} today)`
          }
        >
          <Zap className="w-2.5 h-2.5" />
          {autoCommitsToday > 0 && autoCommitsToday}
        </span>
      )}

      {/* Error badge */}
      {lastError && (
        <AlertCircle className="w-3 h-3 text-red-400 ml-0.5" />
      )}

      {/* Activity icon when running */}
      {isRunning && !lastError && !isCritiquing && (
        <Activity className="w-3 h-3 text-blue-400 ml-0.5" />
      )}
      {/* WP 9B.1: Critique icon when critiquing */}
      {isCritiquing && !lastError && (
        <Swords className="w-3 h-3 text-amber-400 ml-0.5" />
      )}
    </button>
  );
}
