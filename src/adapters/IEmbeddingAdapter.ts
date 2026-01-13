import type { Embedding, SimilarityResult } from '@/shared/types';

export interface IEmbeddingAdapter {
  getForEntity(entityId: string): Promise<Embedding | undefined>;
  store(
    entityId: string,
    vector: number[],
    model: string,
    chunkIndex?: number
  ): Promise<Embedding>;
  delete(entityId: string): Promise<void>;
  deleteAll(): Promise<void>;

  // Similarity search (basic implementation - optimize in Phase 4)
  findSimilar(vector: number[], limit: number, threshold?: number): Promise<SimilarityResult[]>;
}
