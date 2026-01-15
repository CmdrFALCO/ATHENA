import { useEffect, useCallback, useRef } from 'react';

export interface IdleDetectionOptions {
  idleThresholdMs?: number;
  onIdle: () => void;
  onActive: () => void;
}

/**
 * Hook for detecting user idle state.
 * Calls onIdle when user becomes idle and onActive when user becomes active again.
 */
export function useIdleDetection({
  idleThresholdMs = 3000,
  onIdle,
  onActive,
}: IdleDetectionOptions): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isIdleRef.current) {
      isIdleRef.current = false;
      onActive();
    }

    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      onIdle();
    }, idleThresholdMs);
  }, [idleThresholdMs, onIdle, onActive]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Start the timer
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);
}
