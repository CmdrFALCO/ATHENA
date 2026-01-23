import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNotes, useCommandPaletteOpen, uiActions } from '@/store';
import { resourceState$ } from '@/store/resourceState';
import { useSearchAdapter } from '@/adapters';
import type { Note, EntityType, ResourceType } from '@/shared/types';
import type { SearchResult, ResourceSearchResult } from '@/adapters';

/**
 * Unified result type for command palette.
 * Can be an entity (Note) or a resource (PDF, image, etc.)
 */
export interface CommandPaletteResult {
  id: string;
  title: string;
  type: EntityType | ResourceType;
  snippet?: string; // Highlighted match context (only for search results)
  matchType?: 'keyword' | 'semantic' | 'hybrid'; // Search match type
  updatedAt: string;
  isSearchResult: boolean;
  isResource?: boolean; // True for resource results
}

export interface UseCommandPaletteReturn {
  // State
  isOpen: boolean;
  query: string;
  results: CommandPaletteResult[];
  selectedIndex: number;
  isSearching: boolean;

  // Actions
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectCurrent: () => void;
}

const MAX_RESULTS = 10;
const DEBOUNCE_MS = 300;

/**
 * Hook for managing command palette state and behavior.
 * Uses FTS5 full-text search when query is provided,
 * falls back to showing recent notes when query is empty.
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const isOpen = useCommandPaletteOpen();
  const notes = useNotes();
  const searchAdapter = useSearchAdapter();

  const [query, setQueryState] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [resourceSearchResults, setResourceSearchResults] = useState<ResourceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent notes for empty query
  const recentNotes = useMemo(() => {
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });
    return sortedNotes.slice(0, MAX_RESULTS);
  }, [notes]);

  // Convert Note to CommandPaletteResult
  const noteToResult = useCallback((note: Note): CommandPaletteResult => ({
    id: note.id,
    title: note.title || 'Untitled',
    type: note.type,
    updatedAt: note.updated_at,
    isSearchResult: false,
  }), []);

  // Convert SearchResult to CommandPaletteResult
  const searchResultToResult = useCallback((result: SearchResult): CommandPaletteResult => ({
    id: result.entityId,
    title: result.title,
    type: result.type,
    snippet: result.snippet,
    matchType: result.matchType,
    updatedAt: '', // Search results are sorted by relevance, not date
    isSearchResult: true,
    isResource: false,
  }), []);

  // Convert ResourceSearchResult to CommandPaletteResult
  const resourceSearchResultToResult = useCallback((result: ResourceSearchResult): CommandPaletteResult => ({
    id: result.resourceId,
    title: result.name,
    type: result.type,
    snippet: result.snippet,
    matchType: result.matchType,
    updatedAt: '',
    isSearchResult: true,
    isResource: true,
  }), []);

  // Debounced search effect
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      // Empty query: clear search results immediately
      setSearchResults([]);
      setResourceSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Start searching indicator
    setIsSearching(true);

    // Debounce the search (hybrid search combines keyword + semantic)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Search entities and resources in parallel
        const [entityResults, resourceResults] = await Promise.all([
          searchAdapter.hybridSearch(trimmedQuery, { limit: MAX_RESULTS }),
          searchAdapter.searchResources(trimmedQuery, { limit: MAX_RESULTS }),
        ]);
        setSearchResults(entityResults);
        setResourceSearchResults(resourceResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setResourceSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchAdapter]);

  // Compute final results (combining entity and resource results)
  const results: CommandPaletteResult[] = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      // Show recent notes when no query
      return recentNotes.map(noteToResult);
    }
    // Combine entity and resource search results
    // Resources are shown after entities, both sorted by relevance
    const entityPaletteResults = searchResults.map(searchResultToResult);
    const resourcePaletteResults = resourceSearchResults.map(resourceSearchResultToResult);
    return [...entityPaletteResults, ...resourcePaletteResults].slice(0, MAX_RESULTS);
  }, [query, recentNotes, searchResults, resourceSearchResults, noteToResult, searchResultToResult, resourceSearchResultToResult]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const open = useCallback(() => {
    uiActions.openCommandPalette();
    setQueryState('');
    setSelectedIndex(0);
    setSearchResults([]);
    setResourceSearchResults([]);
  }, []);

  const close = useCallback(() => {
    uiActions.closeCommandPalette();
    setQueryState('');
    setSelectedIndex(0);
    setSearchResults([]);
    setResourceSearchResults([]);
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
    const selected = results[selectedIndex];
    if (!selected) return;

    if (selected.isResource) {
      // Select resource
      resourceState$.selectedResourceId.set(selected.id);
    } else {
      // Select entity
      uiActions.selectEntity(selected.id);
    }
    close();
  }, [results, selectedIndex, close]);

  return {
    isOpen,
    query,
    results,
    selectedIndex,
    isSearching,
    open,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    selectCurrent,
  };
}
