import type {
  EmbeddingRecord,
  SimilarityResult,
  ResourceEmbeddingRecord,
  ResourceSimilarityResult,
} from '@/shared/types';
import type { IEmbeddingAdapter } from '../IEmbeddingAdapter';
import type { DatabaseConnection } from '@/database';

/**
 * SQLite implementation of the embedding adapter.
 * Stores vectors as JSON strings and computes similarity in JavaScript.
 */
export class SQLiteEmbeddingAdapter implements IEmbeddingAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async store(entityId: string, vector: number[], model: string): Promise<EmbeddingRecord> {
    const now = new Date().toISOString();

    // Check if embedding exists for this (entity_id, model) pair
    const existing = await this.db.exec<Record<string, unknown>>(
      `SELECT id FROM embeddings WHERE entity_id = ? AND model = ?`,
      [entityId, model]
    );

    const existingRecord = existing[0];
    if (existingRecord) {
      // Update existing embedding
      const id = existingRecord.id as string;
      await this.db.run(
        `UPDATE embeddings SET vector = ?, created_at = ? WHERE id = ?`,
        [JSON.stringify(vector), now, id]
      );

      return {
        id,
        entity_id: entityId,
        vector,
        model,
        created_at: now,
      };
    }

    // Insert new embedding
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO embeddings (id, entity_id, vector, model, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, entityId, JSON.stringify(vector), model, now]
    );

    return {
      id,
      entity_id: entityId,
      vector,
      model,
      created_at: now,
    };
  }

  async getForEntity(entityId: string, model?: string): Promise<EmbeddingRecord | null> {
    let query: string;
    let params: unknown[];

    if (model) {
      query = `SELECT * FROM embeddings WHERE entity_id = ? AND model = ? LIMIT 1`;
      params = [entityId, model];
    } else {
      // Return most recent embedding if model not specified
      query = `SELECT * FROM embeddings WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1`;
      params = [entityId];
    }

    const results = await this.db.exec<Record<string, unknown>>(query, params);
    return results[0] ? this.mapToEmbeddingRecord(results[0]) : null;
  }

  async getAllForEntity(entityId: string): Promise<EmbeddingRecord[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM embeddings WHERE entity_id = ? ORDER BY model ASC`,
      [entityId]
    );
    return results.map((row) => this.mapToEmbeddingRecord(row));
  }

  async findSimilar(
    vector: number[],
    model: string,
    limit: number,
    threshold = 0,
    excludeEntityIds: string[] = []
  ): Promise<SimilarityResult[]> {
    // Get all embeddings for the specified model
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM embeddings WHERE model = ?`,
      [model]
    );

    // Compute similarity for each, filter, sort, and return top results
    const similarities: SimilarityResult[] = results
      .map((row) => {
        const embedding = this.mapToEmbeddingRecord(row);
        return {
          entity_id: embedding.entity_id,
          similarity: this.cosineSimilarity(vector, embedding.vector),
          embedding,
        };
      })
      .filter((r) => {
        // Filter by threshold and excluded entities
        if (r.similarity < threshold) return false;
        if (excludeEntityIds.includes(r.entity_id)) return false;
        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  async deleteForEntity(entityId: string, model?: string): Promise<void> {
    if (model) {
      await this.db.run(`DELETE FROM embeddings WHERE entity_id = ? AND model = ?`, [
        entityId,
        model,
      ]);
    } else {
      await this.db.run(`DELETE FROM embeddings WHERE entity_id = ?`, [entityId]);
    }
  }

  async deleteByModel(model: string): Promise<void> {
    await this.db.run(`DELETE FROM embeddings WHERE model = ?`, [model]);
  }

  async hasEmbedding(entityId: string, model: string): Promise<boolean> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT 1 FROM embeddings WHERE entity_id = ? AND model = ? LIMIT 1`,
      [entityId, model]
    );
    return results.length > 0;
  }

  async getCount(model?: string): Promise<number> {
    let query: string;
    let params: unknown[];

    if (model) {
      query = `SELECT COUNT(*) as count FROM embeddings WHERE model = ?`;
      params = [model];
    } else {
      query = `SELECT COUNT(*) as count FROM embeddings`;
      params = [];
    }

    const results = await this.db.exec<Record<string, unknown>>(query, params);
    return (results[0]?.count as number) || 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.run(`DELETE FROM embeddings`);
  }

  /**
   * Compute cosine similarity between two vectors.
   * Returns value between -1 and 1 (typically 0-1 for normalized embeddings).
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
      }
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Map database row to EmbeddingRecord.
   */
  private mapToEmbeddingRecord(row: Record<string, unknown>): EmbeddingRecord {
    return {
      id: row.id as string,
      entity_id: row.entity_id as string,
      vector: JSON.parse(row.vector as string),
      model: row.model as string,
      created_at: row.created_at as string,
    };
  }

  // === Resource Embedding Methods (WP 6.4) ===

  async storeForResource(
    resourceId: string,
    vector: number[],
    model: string
  ): Promise<ResourceEmbeddingRecord> {
    const now = new Date().toISOString();

    // Check if embedding exists for this (resource_id, model) pair
    const existing = await this.db.exec<Record<string, unknown>>(
      `SELECT id FROM embeddings WHERE resource_id = ? AND model = ?`,
      [resourceId, model]
    );

    const existingRecord = existing[0];
    if (existingRecord) {
      // Update existing embedding
      const id = existingRecord.id as string;
      await this.db.run(`UPDATE embeddings SET vector = ?, created_at = ? WHERE id = ?`, [
        JSON.stringify(vector),
        now,
        id,
      ]);

      return {
        id,
        resource_id: resourceId,
        vector,
        model,
        created_at: now,
      };
    }

    // Insert new embedding (resource_id, not entity_id)
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO embeddings (id, resource_id, vector, model, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, resourceId, JSON.stringify(vector), model, now]
    );

    return {
      id,
      resource_id: resourceId,
      vector,
      model,
      created_at: now,
    };
  }

  async getForResource(
    resourceId: string,
    model?: string
  ): Promise<ResourceEmbeddingRecord | null> {
    let query: string;
    let params: unknown[];

    if (model) {
      query = `SELECT * FROM embeddings WHERE resource_id = ? AND model = ? LIMIT 1`;
      params = [resourceId, model];
    } else {
      query = `SELECT * FROM embeddings WHERE resource_id = ? ORDER BY created_at DESC LIMIT 1`;
      params = [resourceId];
    }

    const results = await this.db.exec<Record<string, unknown>>(query, params);
    return results[0] ? this.mapToResourceEmbeddingRecord(results[0]) : null;
  }

  async findSimilarResources(
    vector: number[],
    model: string,
    limit: number,
    threshold = 0
  ): Promise<ResourceSimilarityResult[]> {
    // Get all resource embeddings for the specified model
    // Join with resources table to get name, type, extractedText
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT e.*, r.name, r.type, r.extracted_text
       FROM embeddings e
       JOIN resources r ON r.id = e.resource_id
       WHERE e.resource_id IS NOT NULL
         AND e.model = ?
         AND r.invalid_at IS NULL`,
      [model]
    );

    // Compute similarity for each, filter, sort, and return top results
    const similarities: ResourceSimilarityResult[] = results
      .map((row) => {
        const rowVector = JSON.parse(row.vector as string) as number[];
        return {
          resource_id: row.resource_id as string,
          similarity: this.cosineSimilarity(vector, rowVector),
          name: row.name as string | undefined,
          type: row.type as string | undefined,
          extractedText: row.extracted_text as string | null,
        };
      })
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  async deleteForResource(resourceId: string, model?: string): Promise<void> {
    if (model) {
      await this.db.run(`DELETE FROM embeddings WHERE resource_id = ? AND model = ?`, [
        resourceId,
        model,
      ]);
    } else {
      await this.db.run(`DELETE FROM embeddings WHERE resource_id = ?`, [resourceId]);
    }
  }

  private mapToResourceEmbeddingRecord(row: Record<string, unknown>): ResourceEmbeddingRecord {
    return {
      id: row.id as string,
      resource_id: row.resource_id as string,
      vector: JSON.parse(row.vector as string),
      model: row.model as string,
      created_at: row.created_at as string,
    };
  }
}
