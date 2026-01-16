import { useState, useCallback } from 'react';
import { useSearchAdapter } from '@/adapters';
import type { SearchResult, SearchOptions } from '@/adapters';
import { SemanticSearchService } from '../services/SemanticSearchService';

export interface UseSemanticSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  clear: () => void;
}

/**
 * React hook for semantic (vector similarity) search.
 * Embeds queries and finds conceptually related notes.
 */
export function useSemanticSearch(): UseSemanticSearchReturn {
  const searchAdapter = useSearchAdapter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
      setIsSearching(true);
      setError(null);

      try {
        const service = new SemanticSearchService(searchAdapter);
        const searchResults = await service.search(query, options);
        setResults(searchResults);
        return searchResults;
      } catch (err) {
        const searchError = err instanceof Error ? err : new Error('Semantic search failed');
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
