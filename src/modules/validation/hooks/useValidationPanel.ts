/**
 * useValidationPanel - Hook for managing validation panel open/close state
 * WP 5.6: Validation Panel UI
 *
 * Handles keyboard shortcut (Ctrl+Shift+V) for toggling the panel.
 */

import { useState, useEffect, useCallback } from 'react';

export function useValidationPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Keyboard shortcut: Ctrl+Shift+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
