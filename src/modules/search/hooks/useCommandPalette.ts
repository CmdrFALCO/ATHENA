import { useState, useCallback, useMemo } from 'react';
import { useNotes, useCommandPaletteOpen, uiActions } from '@/store';
import type { Note } from '@/shared/types';

export interface UseCommandPaletteReturn {
  // State
  isOpen: boolean;
  query: string;
  results: Note[];
  selectedIndex: number;

  // Actions
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectCurrent: () => void;
}

const MAX_RESULTS = 10;

/**
 * Hook for managing command palette state and behavior.
 * Provides filtering, keyboard navigation, and entity selection.
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const isOpen = useCommandPaletteOpen();
  const notes = useNotes();
  const [query, setQueryState] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter and sort results
  const results = useMemo(() => {
    // Sort notes by updated_at descending (most recent first)
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });

    if (!query.trim()) {
      // Empty query: show recent notes
      return sortedNotes.slice(0, MAX_RESULTS);
    }

    // Filter by title (case-insensitive)
    const lowerQuery = query.toLowerCase();
    const filtered = sortedNotes.filter((note) =>
      note.title.toLowerCase().includes(lowerQuery)
    );

    return filtered.slice(0, MAX_RESULTS);
  }, [notes, query]);

  // Reset selection when results change
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    setSelectedIndex(0);
  }, []);

  const open = useCallback(() => {
    uiActions.openCommandPalette();
    setQueryState('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    uiActions.closeCommandPalette();
    setQueryState('');
    setSelectedIndex(0);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => {
      if (results.length === 0) return 0;
      return (prev + 1) % results.length;
    });
  }, [results.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => {
      if (results.length === 0) return 0;
      return prev === 0 ? results.length - 1 : prev - 1;
    });
  }, [results.length]);

  const selectCurrent = useCallback(() => {
    if (results.length === 0 || selectedIndex >= results.length) return;

    const selectedNote = results[selectedIndex];
    uiActions.selectEntity(selectedNote.id);
    close();
  }, [results, selectedIndex, close]);

  return {
    isOpen,
    query,
    results,
    selectedIndex,
    open,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    selectCurrent,
  };
}
