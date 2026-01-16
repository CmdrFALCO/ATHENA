import { useState, useCallback } from 'react';
import { useSearchAdapter } from '@/adapters';
import type { SearchResult, SearchOptions } from '@/adapters';
import { KeywordSearchService } from '../services/KeywordSearchService';

export interface UseKeywordSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  clear: () => void;
}

/**
 * React hook for FTS5 keyword search.
 * Provides search state management and debounced search execution.
 */
export function useKeywordSearch(): UseKeywordSearchReturn {
  const searchAdapter = useSearchAdapter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
      setIsSearching(true);
      setError(null);

      try {
        const service = new KeywordSearchService(searchAdapter);
        const searchResults = await service.search(query, options);
        setResults(searchResults);
        return searchResults;
      } catch (err) {
        const searchError = err instanceof Error ? err : new Error('Search failed');
        setError(searchError);
        setResults([]);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [searchAdapter]
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isSearching, error, search, clear };
}
