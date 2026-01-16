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

export interface HybridSearchOptions extends SearchOptions {
  /** RRF smoothing constant (default: 60) */
  k?: number;
  /** Weight for keyword results (default: 1.0) */
  keywordWeight?: number;
  /** Weight for semantic results (default: 1.0) */
  semanticWeight?: number;
}

export interface ISearchAdapter {
  /**
   * Full-text search using FTS5
   * @param query - Search terms (supports FTS5 syntax: AND, OR, NOT, "phrases")
   * @param options - Search options
   */
  keywordSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Semantic search using vector similarity
   * Embeds the query and finds conceptually related notes even when exact words don't match.
   * @param query - Natural language query to embed and search
   * @param options - Search options (limit, entityTypes)
   */
  semanticSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Hybrid search combining keyword (FTS5/BM25) and semantic (vector) search.
   * Uses Reciprocal Rank Fusion (RRF) to combine results, boosting entities
   * that appear in both result sets.
   * @param query - Search terms
   * @param options - Hybrid search options including RRF parameters
   */
  hybridSearch(query: string, options?: HybridSearchOptions): Promise<SearchResult[]>;
}
