import { useState, useCallback, useEffect } from 'react';

export interface UseSimilarityPanelReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useSimilarityPanel(): UseSimilarityPanelReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Keyboard shortcut: Ctrl+Shift+M to toggle, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggle();
      }
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
