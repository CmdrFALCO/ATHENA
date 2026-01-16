import type { EntityType } from '@/shared/types';
import type { ISearchAdapter, SearchResult, SearchOptions } from '../ISearchAdapter';
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
}
