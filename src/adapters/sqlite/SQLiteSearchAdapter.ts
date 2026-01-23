import type { EntityType, ResourceType } from '@/shared/types';
import type {
  ISearchAdapter,
  SearchResult,
  ResourceSearchResult,
  SearchOptions,
  HybridSearchOptions,
} from '../ISearchAdapter';
import { applyRRF } from '@/modules/search/services/HybridSearchService';
import type { DatabaseConnection } from '@/database';
import type { IEmbeddingAdapter } from '../IEmbeddingAdapter';
import type { INoteAdapter } from '../INoteAdapter';
import { getAIService } from '@/modules/ai/AIService';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

/**
 * Sanitize user query for FTS5 to prevent syntax errors.
 * Wraps each word in double quotes to treat as literal terms.
 */
function sanitizeQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => {
      // Check if the word is already a quoted phrase
      if (word.startsWith('"') && word.endsWith('"')) {
        return word;
      }
      // Escape internal double quotes and wrap in quotes
      return `"${word.replace(/"/g, '""')}"`;
    })
    .join(' ');
}

export class SQLiteSearchAdapter implements ISearchAdapter {
  private db: DatabaseConnection;
  private embeddingAdapter: IEmbeddingAdapter | null;
  private noteAdapter: INoteAdapter | null;

  constructor(
    db: DatabaseConnection,
    embeddingAdapter?: IEmbeddingAdapter,
    noteAdapter?: INoteAdapter
  ) {
    this.db = db;
    this.embeddingAdapter = embeddingAdapter ?? null;
    this.noteAdapter = noteAdapter ?? null;
  }

  async keywordSearch(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const entityTypes = options?.entityTypes;

    // Sanitize query for FTS5
    const ftsQuery = sanitizeQuery(trimmedQuery);
    if (!ftsQuery) {
      return [];
    }

    // Build the SQL query
    // Column indices for snippet(): 0=id (UNINDEXED), 1=title, 2=content_text
    // Use column 2 (content_text) for content snippets
    // bm25() returns negative scores (more negative = more relevant)
    let sql = `
      SELECT
        e.id,
        e.title,
        e.type,
        e.created_at,
        e.updated_at,
        snippet(entities_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
        bm25(entities_fts) as score
      FROM entities_fts
      JOIN entities e ON e.id = entities_fts.id
      WHERE entities_fts MATCH ?
        AND e.invalid_at IS NULL
    `;

    const params: unknown[] = [ftsQuery];

    // Add entity type filter if specified
    if (entityTypes && entityTypes.length > 0) {
      const placeholders = entityTypes.map(() => '?').join(', ');
      sql += ` AND e.type IN (${placeholders})`;
      params.push(...entityTypes);
    }

    // Order by relevance (bm25 returns negative, so ascending = most relevant first)
    sql += ` ORDER BY score LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
      const results = await this.db.exec<Record<string, unknown>>(sql, params);
      return results.map((row) => this.mapToSearchResult(row));
    } catch (error) {
      // Log FTS5 errors but don't crash - return empty results
      console.error('FTS5 search error:', error, { query: trimmedQuery, ftsQuery });
      return [];
    }
  }

  private mapToSearchResult(row: Record<string, unknown>): SearchResult {
    return {
      entityId: row.id as string,
      title: (row.title as string) || 'Untitled',
      type: row.type as EntityType,
      snippet: (row.snippet as string) || '',
      score: row.score as number,
      matchType: 'keyword',
      createdAt: row.created_at as string | undefined,
      updatedAt: row.updated_at as string | undefined,
    };
  }

  async semanticSearch(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // Check if we have the required adapters
    if (!this.embeddingAdapter || !this.noteAdapter) {
      console.warn('Semantic search requires embedding and note adapters');
      return [];
    }

    const limit = options?.limit ?? 10;
    const threshold = 0.5; // Minimum similarity score
    const entityTypes = options?.entityTypes;

    try {
      const aiService = getAIService();

      // Check if AI is configured
      if (!aiService.isConfigured()) {
        console.warn('AI not configured, cannot perform semantic search');
        return [];
      }

      // 1. Embed the query
      const embeddingResult = await aiService.embed(trimmed);
      if (!embeddingResult.vector || embeddingResult.vector.length === 0) {
        console.warn('Failed to embed query');
        return [];
      }

      // 2. Get current embedding model
      const model = aiService.getActiveEmbeddingModel();
      if (!model) {
        console.warn('No active embedding model');
        return [];
      }

      // 3. Find similar embeddings (fetch extra for type filtering)
      const similarResults = await this.embeddingAdapter.findSimilar(
        embeddingResult.vector,
        model,
        limit * 2,
        threshold
      );

      if (similarResults.length === 0) {
        return [];
      }

      // 4. Map to SearchResult format
      const results: SearchResult[] = [];

      for (const similar of similarResults) {
        // Get entity details
        const entity = await this.noteAdapter.getById(similar.entity_id);
        if (!entity) continue;

        // Skip soft-deleted (double-check, though getById should handle this)
        if (entity.invalid_at) continue;

        // Apply type filter
        if (entityTypes && entityTypes.length > 0 && !entityTypes.includes(entity.type)) {
          continue;
        }

        results.push({
          entityId: similar.entity_id,
          title: entity.title || 'Untitled',
          type: entity.type,
          snippet: this.generateSnippet(entity.content),
          score: similar.similarity, // Already 0-1 range
          matchType: 'semantic',
          createdAt: entity.created_at,
          updatedAt: entity.updated_at,
        });

        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Generate a plain text snippet from entity content.
   * No highlighting for semantic search (no exact match to highlight).
   */
  private generateSnippet(content: unknown): string {
    const text = extractTextFromTiptap(content);
    if (text.length <= 100) return text;
    return text.substring(0, 100).trim() + '...';
  }

  /**
   * Hybrid search combining keyword (FTS5/BM25) and semantic (vector) search.
   * Uses Reciprocal Rank Fusion (RRF) to combine and re-rank results.
   *
   * Entities appearing in BOTH result sets rank higher than those in only one.
   * Falls back to keyword-only if semantic search is unavailable.
   */
  async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const {
      limit = 20,
      k = 60,
      keywordWeight = 1.0,
      semanticWeight = 1.0,
      entityTypes,
    } = options;

    // Fetch more results than limit to allow for better RRF merging
    const fetchLimit = Math.min(limit * 2, 50);

    // Run both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch(query, { limit: fetchLimit, entityTypes }),
      this.semanticSearch(query, { limit: fetchLimit, entityTypes }).catch((err) => {
        // Graceful degradation: if semantic search fails, continue with keyword only
        console.warn('Semantic search failed, using keyword-only results:', err);
        return [] as SearchResult[];
      }),
    ]);

    // If no semantic results (AI unavailable or no embeddings), return keyword results
    if (semanticResults.length === 0) {
      return keywordResults.slice(0, limit);
    }

    // Apply RRF to merge and re-rank results
    return applyRRF(keywordResults, semanticResults, {
      limit,
      k,
      keywordWeight,
      semanticWeight,
    });
  }

  // === WP 6.4: Resource Search Methods ===

  /**
   * Search resources via FTS5
   */
  async searchResources(query: string, options?: SearchOptions): Promise<ResourceSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    // Sanitize query for FTS5
    const ftsQuery = sanitizeQuery(trimmedQuery);
    if (!ftsQuery) {
      return [];
    }

    // Column indices for snippet(): 0=id (UNINDEXED), 1=name, 2=user_notes, 3=extracted_text
    // Use column 3 (extracted_text) for content snippets
    const sql = `
      SELECT
        r.id,
        r.name,
        r.type,
        r.created_at,
        r.updated_at,
        snippet(resources_fts, 3, '<mark>', '</mark>', '...', 32) as snippet,
        bm25(resources_fts) as score
      FROM resources_fts
      JOIN resources r ON r.id = resources_fts.id
      WHERE resources_fts MATCH ?
        AND r.invalid_at IS NULL
      ORDER BY score
      LIMIT ? OFFSET ?
    `;

    try {
      const results = await this.db.exec<Record<string, unknown>>(sql, [ftsQuery, limit, offset]);
      return results.map((row) => this.mapToResourceSearchResult(row));
    } catch (error) {
      console.error('Resource FTS5 search error:', error, { query: trimmedQuery, ftsQuery });
      return [];
    }
  }

  /**
   * Semantic search for resources using vector similarity
   */
  async semanticSearchResources(query: string, options?: SearchOptions): Promise<ResourceSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (!this.embeddingAdapter) {
      console.warn('Semantic search requires embedding adapter');
      return [];
    }

    const limit = options?.limit ?? 10;
    const threshold = 0.5;

    try {
      const aiService = getAIService();

      if (!aiService.isConfigured()) {
        console.warn('AI not configured, cannot perform semantic search');
        return [];
      }

      // 1. Embed the query
      const embeddingResult = await aiService.embed(trimmed);
      if (!embeddingResult.vector || embeddingResult.vector.length === 0) {
        console.warn('Failed to embed query');
        return [];
      }

      // 2. Get current embedding model
      const model = aiService.getActiveEmbeddingModel();
      if (!model) {
        console.warn('No active embedding model');
        return [];
      }

      // 3. Find similar resource embeddings
      const similarResults = await this.embeddingAdapter.findSimilarResources(
        embeddingResult.vector,
        model,
        limit,
        threshold
      );

      if (similarResults.length === 0) {
        return [];
      }

      // 4. Map to ResourceSearchResult format
      // We need to fetch resource details since findSimilarResources returns them
      return similarResults.map((r) => ({
        resourceId: r.resource_id,
        name: r.name || 'Untitled',
        type: (r.type || 'pdf') as ResourceType,
        snippet: r.extractedText?.slice(0, 150) + '...' || '',
        score: r.similarity,
        matchType: 'semantic' as const,
      }));
    } catch (error) {
      console.error('Resource semantic search error:', error);
      return [];
    }
  }

  private mapToResourceSearchResult(row: Record<string, unknown>): ResourceSearchResult {
    return {
      resourceId: row.id as string,
      name: (row.name as string) || 'Untitled',
      type: row.type as ResourceType,
      snippet: (row.snippet as string) || '',
      score: row.score as number,
      matchType: 'keyword',
      createdAt: row.created_at as string | undefined,
      updatedAt: row.updated_at as string | undefined,
    };
  }
}
