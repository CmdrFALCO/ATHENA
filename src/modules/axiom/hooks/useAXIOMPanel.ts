/**
 * useAXIOMPanel — Hook for managing AXIOM panel open/close state
 * WP 9A.3: AXIOM Visualization
 *
 * Handles keyboard shortcut (Ctrl+Shift+A) for toggling the panel.
 * Follows the pattern from validation/hooks/useValidationPanel.ts.
 */

import { useEffect, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';

export function useAXIOMPanel() {
  const isOpen = useSelector(() => axiomState$.panelOpen.get());

  const open = useCallback(() => axiomActions.openPanel(), []);
  const close = useCallback(() => axiomActions.closePanel(), []);
  const toggle = useCallback(() => axiomActions.togglePanel(), []);

  // Keyboard shortcut: Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
