import type { Embedding, SimilarityResult } from '@/shared/types';
import type { IEmbeddingAdapter } from '../IEmbeddingAdapter';
import type { DatabaseConnection } from '@/database';

export class SQLiteEmbeddingAdapter implements IEmbeddingAdapter {
  constructor(private db: DatabaseConnection) {}

  async getForEntity(entityId: string): Promise<Embedding | undefined> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM embeddings WHERE entity_id = ? ORDER BY chunk_index ASC LIMIT 1`,
      [entityId]
    );
    return results[0] ? this.mapToEmbedding(results[0]) : undefined;
  }

  async store(
    entityId: string,
    vector: number[],
    model: string,
    chunkIndex = 0
  ): Promise<Embedding> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Delete existing embedding for this entity/chunk
    await this.db.run(`DELETE FROM embeddings WHERE entity_id = ? AND chunk_index = ?`, [
      entityId,
      chunkIndex,
    ]);

    await this.db.run(
      `INSERT INTO embeddings (id, entity_id, chunk_index, vector, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, entityId, chunkIndex, JSON.stringify(vector), model, now]
    );

    const result = await this.getForEntity(entityId);
    if (!result) {
      throw new Error('Failed to store embedding');
    }
    return result;
  }

  async delete(entityId: string): Promise<void> {
    await this.db.run(`DELETE FROM embeddings WHERE entity_id = ?`, [entityId]);
  }

  async deleteAll(): Promise<void> {
    await this.db.run(`DELETE FROM embeddings`);
  }

  async findSimilar(
    queryVector: number[],
    limit: number,
    threshold = 0
  ): Promise<SimilarityResult[]> {
    // Get all embeddings and compute similarity in JS
    // (SQLite WASM doesn't have native vector ops)
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT entity_id, vector FROM embeddings`
    );

    const similarities: SimilarityResult[] = results
      .map((row) => ({
        entity_id: row.entity_id as string,
        similarity: this.cosineSimilarity(queryVector, JSON.parse(row.vector as string)),
      }))
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

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

  private mapToEmbedding(row: Record<string, unknown>): Embedding {
    return {
      id: row.id as string,
      entity_id: row.entity_id as string,
      chunk_index: row.chunk_index as number,
      vector: JSON.parse(row.vector as string),
      model: row.model as string,
      created_at: row.created_at as string,
    };
  }
}
