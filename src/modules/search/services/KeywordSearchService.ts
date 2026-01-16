import type { ISearchAdapter, SearchResult, SearchOptions } from '@/adapters/ISearchAdapter';

const DEFAULT_LIMIT = 10;

/**
 * Service layer for keyword-based full-text search.
 * Wraps the search adapter and adds business logic.
 */
export class KeywordSearchService {
  private searchAdapter: ISearchAdapter;

  constructor(searchAdapter: ISearchAdapter) {
    this.searchAdapter = searchAdapter;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    return this.searchAdapter.keywordSearch(trimmed, {
      limit: DEFAULT_LIMIT,
      ...options,
    });
  }
}
