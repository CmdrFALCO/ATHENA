import type { EntityType } from '@/shared/types';

export interface SearchResult {
  entityId: string;
  title: string;
  type: EntityType;
  snippet: string; // Highlighted match context with <mark> tags
  score: number; // BM25 relevance score (more negative = more relevant)
  matchType: 'keyword' | 'semantic' | 'hybrid';
}

export interface SearchOptions {
  limit?: number; // Default: 10
  offset?: number; // For pagination
  entityTypes?: EntityType[]; // Filter by type
}

export interface ISearchAdapter {
  /**
   * Full-text search using FTS5
   * @param query - Search terms (supports FTS5 syntax: AND, OR, NOT, "phrases")
   * @param options - Search options
   */
  keywordSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
