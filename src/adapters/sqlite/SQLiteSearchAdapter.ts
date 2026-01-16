import type { EntityType } from '@/shared/types';
import type { ISearchAdapter, SearchResult, SearchOptions } from '../ISearchAdapter';
import type { DatabaseConnection } from '@/database';

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

  constructor(db: DatabaseConnection) {
    this.db = db;
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
}
