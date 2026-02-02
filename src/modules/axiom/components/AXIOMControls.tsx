/**
 * AXIOMControls — Manual workflow controls
 * WP 9A.3: AXIOM Visualization
 *
 * Play/Pause toggle, Step (fire one transition), and Reset.
 * Displays step counter: "Steps: N / maxSteps".
 */

import { useSelector } from '@legendapp/state/react';
import { Pause, Play, SkipForward, RotateCcw } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { devSettings$ } from '@/config/devSettings';

interface AXIOMControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onStep?: () => void;
  onReset?: () => void;
}

export function AXIOMControls({ onPause, onResume, onStep, onReset }: AXIOMControlsProps) {
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const isPaused = useSelector(() => axiomState$.isPaused.get());
  const stepCount = useSelector(() => axiomState$.stepCount.get());
  const maxSteps = useSelector(() => devSettings$.axiom.workflow.maxSteps.get());

  const handlePlayPause = () => {
    if (isRunning && !isPaused) {
      onPause?.();
    } else {
      onResume?.();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pause / Resume */}
      <button
        onClick={handlePlayPause}
        disabled={!isRunning && !isPaused}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded
          bg-athena-surface border border-athena-border text-athena-text
          hover:bg-athena-border disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors"
        title={isRunning && !isPaused ? 'Pause workflow' : 'Resume workflow'}
      >
        {isRunning && !isPaused ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            Pause
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Resume
          </>
        )}
      </button>

      {/* Step */}
      <button
        onClick={onStep}
        disabled={!isRunning && !isPaused}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded
          bg-athena-surface border border-athena-border text-athena-text
          hover:bg-athena-border disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors"
        title="Fire one transition"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Step
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded
          bg-athena-surface border border-athena-border text-athena-text
          hover:bg-athena-border transition-colors"
        title="Reset workflow"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </button>

      {/* Step counter */}
      <span className="ml-auto text-xs text-athena-muted tabular-nums">
        Steps: {stepCount} / {maxSteps}
      </span>
    </div>
  );
}
