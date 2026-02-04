/**
 * TestRobustnessButton — Trigger structural invariance tests
 * WP 9B.5
 *
 * Reusable button for testing connection robustness.
 * Shows loading state during test, results after completion.
 */

import { useState, useCallback } from 'react';
import { FlaskConical, Loader2, RotateCw } from 'lucide-react';
import type { InvarianceEvidence } from '../autonomous/invariance/types';
import { InvarianceBadge } from './InvarianceBadge';

interface TestRobustnessButtonProps {
  /** Run the invariance test — should call InvarianceService.testConnection() */
  onTest: () => Promise<InvarianceEvidence>;
  /** Existing evidence (if any) */
  existingEvidence?: InvarianceEvidence | null;
  /** Show failure modes in result badge */
  showFailureModes?: boolean;
}

export function TestRobustnessButton({
  onTest,
  existingEvidence = null,
  showFailureModes = true,
}: TestRobustnessButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [evidence, setEvidence] = useState<InvarianceEvidence | null>(
    existingEvidence,
  );
  const [error, setError] = useState<string | null>(null);

  const handleTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onTest();
      setEvidence(result);
    } catch (err) {
      console.error('[Invariance] Test failed:', err);
      setError('Test failed');
    } finally {
      setIsLoading(false);
    }
  }, [onTest]);

  // Loading state
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium
        text-athena-muted bg-athena-border/10 border border-athena-border/30 rounded">
        <Loader2 className="w-3 h-3 animate-spin" />
        Testing...
      </span>
    );
  }

  // Has results
  if (evidence && evidence.robustnessLabel !== 'untested') {
    return (
      <div className="flex items-center gap-1.5">
        <InvarianceBadge
          evidence={evidence}
          showFailureModes={showFailureModes}
        />
        <button
          onClick={handleTest}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px]
            text-athena-muted hover:text-athena-text border border-athena-border/30
            rounded hover:bg-athena-border/10 transition-colors"
          title="Re-test robustness"
        >
          <RotateCw className="w-2.5 h-2.5" />
          Re-test
        </button>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-red-400">{error}</span>
        <button
          onClick={handleTest}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px]
            text-athena-muted hover:text-athena-text border border-athena-border/30
            rounded hover:bg-athena-border/10 transition-colors"
          title="Retry"
        >
          <RotateCw className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  // Default: show test button
  return (
    <button
      onClick={handleTest}
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium
        text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded
        hover:bg-purple-500/20 transition-colors"
    >
      <FlaskConical className="w-3 h-3" />
      Test Robustness
    </button>
  );
}
