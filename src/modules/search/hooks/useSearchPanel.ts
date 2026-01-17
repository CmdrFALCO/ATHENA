/**
 * useSearchPanel - Hook for managing Search Panel open/close state
 * WP 4.6: Faceted Search Panel
 */

import { useState, useCallback, useEffect } from 'react';

export interface UseSearchPanelReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for Search Panel state management.
 * Includes keyboard shortcuts: Cmd+Shift+K to toggle, Escape to close.
 */
export function useSearchPanel(): UseSearchPanelReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Keyboard shortcut: Cmd+Shift+K to toggle, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+Shift+K or Ctrl+Shift+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, toggle, close]);

  return { isOpen, open, close, toggle };
}
