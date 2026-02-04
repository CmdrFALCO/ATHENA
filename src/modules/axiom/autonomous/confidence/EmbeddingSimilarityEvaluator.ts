/**
 * Embedding Similarity Evaluator — WP 9B.3
 *
 * Evaluates semantic similarity using existing embedding vectors.
 *
 * For connections: cosine similarity between source and target embeddings
 * For entities: average similarity to K nearest existing entities
 */

import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';

export class EmbeddingSimilarityEvaluator {
  constructor(private embeddingAdapter: IEmbeddingAdapter) {}

  /**
   * Evaluate embedding similarity for a proposed connection.
   * @returns 0-1 normalized score
   */
  async evaluateConnection(
    sourceId: string,
    targetId: string,
  ): Promise<number> {
    const [sourceEmb, targetEmb] = await Promise.all([
      this.embeddingAdapter.getForEntity(sourceId),
      this.embeddingAdapter.getForEntity(targetId),
    ]);

    // If embeddings not available for either entity, return neutral
    if (!sourceEmb || !targetEmb) {
      return 0.5;
    }

    const similarity = this.cosineSimilarity(sourceEmb.vector, targetEmb.vector);

    // Normalize: raw cosine can be -1 to 1, map to 0-1
    return this.normalizeSimilarity(similarity);
  }

  /**
   * Evaluate embedding similarity for a new entity.
   * @returns 0-1 score based on average similarity to K nearest neighbors
   */
  async evaluateEntity(entityId: string, k = 5): Promise<number> {
    const embedding = await this.embeddingAdapter.getForEntity(entityId);
    if (!embedding) {
      return 0.5; // No embedding — neutral
    }

    const similar = await this.embeddingAdapter.findSimilar(
      embedding.vector,
      embedding.model,
      k,
      0, // No threshold — get top K regardless
      [entityId], // Exclude self
    );

    if (similar.length === 0) {
      return 0.5; // No other entities with embeddings — neutral
    }

    // Average similarity to nearest neighbors
    const avgSimilarity =
      similar.reduce((sum, r) => sum + r.similarity, 0) / similar.length;

    return this.normalizeSimilarity(avgSimilarity);
  }

  /**
   * Normalize raw cosine similarity to a 0-1 score.
   * Maps from typical cosine range to a more intuitive score.
   */
  private normalizeSimilarity(similarity: number): number {
    // Cosine similarity in embedding space is typically 0-1 for
    // normalized vectors. Map to an intuitive score:
    if (similarity < 0.3) return 0.2; // Weak semantic link
    if (similarity < 0.5) return 0.3 + (similarity - 0.3) * 2; // 0.3-0.7
    if (similarity < 0.7) return 0.5 + (similarity - 0.5) * 1.5; // 0.5-0.8
    return 0.7 + (similarity - 0.7) * 1.0; // 0.7-1.0
  }

  /**
   * Compute cosine similarity between two vectors.
   * Reuses the same formula as the existing codebase (SQLiteEmbeddingAdapter).
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
}
