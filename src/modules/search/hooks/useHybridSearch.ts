import { useState, useCallback } from 'react';
import { useSearchAdapter } from '@/adapters';
import type { SearchResult, HybridSearchOptions } from '@/adapters';
import { HybridSearchService } from '../services/HybridSearchService';

export interface UseHybridSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string, options?: HybridSearchOptions) => Promise<SearchResult[]>;
  clear: () => void;
}

/**
 * React hook for hybrid search (keyword + semantic with RRF).
 * Combines FTS5 keyword results with vector similarity results,
 * boosting entities that appear in both result sets.
 */
export function useHybridSearch(): UseHybridSearchReturn {
  const searchAdapter = useSearchAdapter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (query: string, options?: HybridSearchOptions): Promise<SearchResult[]> => {
      setIsSearching(true);
      setError(null);

      try {
        const service = new HybridSearchService(searchAdapter);
        const searchResults = await service.search(query, options);
        setResults(searchResults);
        return searchResults;
      } catch (err) {
        const searchError = err instanceof Error ? err : new Error('Hybrid search failed');
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
