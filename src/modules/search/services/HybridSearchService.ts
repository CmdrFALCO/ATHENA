import type { ISearchAdapter, SearchResult, HybridSearchOptions } from '@/adapters/ISearchAdapter';

const DEFAULT_LIMIT = 20;
const DEFAULT_K = 60;
const DEFAULT_KEYWORD_WEIGHT = 1.0;
const DEFAULT_SEMANTIC_WEIGHT = 1.0;

/**
 * Reciprocal Rank Fusion (RRF) Algorithm
 *
 * For each result set, calculate: score = 1 / (k + rank)
 * where k is a smoothing constant (typically 60) and rank is 1-indexed position.
 *
 * If an entity appears in both sets, its scores are summed.
 * Final ranking is by combined RRF score (higher = better).
 *
 * Example with k=60:
 * - Rank 1: 1/(60+1) = 0.0164
 * - Rank 2: 1/(60+2) = 0.0161
 * - Rank 10: 1/(60+10) = 0.0143
 *
 * Entity in rank 5 of both sets: 0.0154 + 0.0154 = 0.0308 (ranks higher)
 */
export class HybridSearchService {
  private searchAdapter: ISearchAdapter;

  constructor(searchAdapter: ISearchAdapter) {
    this.searchAdapter = searchAdapter;
  }

  async search(query: string, options?: HybridSearchOptions): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    return this.searchAdapter.hybridSearch(trimmed, {
      limit: DEFAULT_LIMIT,
      k: DEFAULT_K,
      keywordWeight: DEFAULT_KEYWORD_WEIGHT,
      semanticWeight: DEFAULT_SEMANTIC_WEIGHT,
      ...options,
    });
  }
}

/**
 * Apply Reciprocal Rank Fusion to merge keyword and semantic search results.
 * Exported for use by SQLiteSearchAdapter and for testing.
 *
 * @param keywordResults - Results from keyword (FTS5/BM25) search
 * @param semanticResults - Results from semantic (vector) search
 * @param options - RRF parameters
 * @returns Merged and re-ranked results
 */
export function applyRRF(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  options: {
    limit: number;
    k: number;
    keywordWeight: number;
    semanticWeight: number;
  }
): SearchResult[] {
  const { limit, k, keywordWeight, semanticWeight } = options;

  // Calculate RRF scores for each entity
  const rrfScores = new Map<string, number>();

  // Process keyword results (rank is 1-indexed)
  keywordResults.forEach((result, rank) => {
    const score = keywordWeight * (1 / (k + rank + 1));
    const existing = rrfScores.get(result.entityId) || 0;
    rrfScores.set(result.entityId, existing + score);
  });

  // Process semantic results (rank is 1-indexed)
  semanticResults.forEach((result, rank) => {
    const score = semanticWeight * (1 / (k + rank + 1));
    const existing = rrfScores.get(result.entityId) || 0;
    rrfScores.set(result.entityId, existing + score);
  });

  // Build lookup sets for determining match type
  const keywordEntityIds = new Set(keywordResults.map((r) => r.entityId));
  const semanticEntityIds = new Set(semanticResults.map((r) => r.entityId));

  // Merge results, preferring keyword snippets (they have highlighting)
  const resultMap = new Map<string, SearchResult>();

  // Add keyword results first (they have highlighted snippets)
  for (const result of keywordResults) {
    resultMap.set(result.entityId, { ...result });
  }

  // Add semantic results only if not already present
  for (const result of semanticResults) {
    if (!resultMap.has(result.entityId)) {
      resultMap.set(result.entityId, { ...result });
    }
  }

  // Convert to array and set matchType + RRF score
  const merged = Array.from(resultMap.values()).map((result) => {
    const inKeyword = keywordEntityIds.has(result.entityId);
    const inSemantic = semanticEntityIds.has(result.entityId);

    return {
      ...result,
      matchType: (inKeyword && inSemantic ? 'hybrid' : inKeyword ? 'keyword' : 'semantic') as
        | 'keyword'
        | 'semantic'
        | 'hybrid',
      score: rrfScores.get(result.entityId) || 0,
    };
  });

  // Sort by RRF score descending (higher = more relevant)
  merged.sort((a, b) => b.score - a.score);

  // Return limited results
  return merged.slice(0, limit);
}
