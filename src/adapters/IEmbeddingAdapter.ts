import type {
  EmbeddingRecord,
  SimilarityResult,
  ResourceEmbeddingRecord,
  ResourceSimilarityResult,
} from '@/shared/types';

/**
 * Adapter interface for embedding storage operations.
 * Supports both single-model and multi-model embedding strategies.
 * Extended in WP 6.4 to support resource embeddings.
 */
export interface IEmbeddingAdapter {
  /**
   * Store an embedding for an entity.
   * Upserts if same (entity_id, model) pair exists.
   */
  store(entityId: string, vector: number[], model: string): Promise<EmbeddingRecord>;

  /**
   * Get embedding for an entity, optionally filtered by model.
   * Returns the most recent embedding if model not specified.
   */
  getForEntity(entityId: string, model?: string): Promise<EmbeddingRecord | null>;

  /**
   * Get all embeddings for an entity (for multi-model scenarios).
   */
  getAllForEntity(entityId: string): Promise<EmbeddingRecord[]>;

  /**
   * Find similar entities by cosine similarity.
   * @param vector - Query vector to compare against
   * @param model - Only compare against embeddings from this model
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity score (0-1, default 0)
   * @param excludeEntityIds - Entity IDs to exclude from results
   */
  findSimilar(
    vector: number[],
    model: string,
    limit: number,
    threshold?: number,
    excludeEntityIds?: string[]
  ): Promise<SimilarityResult[]>;

  /**
   * Delete embedding(s) for an entity.
   * If model specified, only delete that model's embedding.
   */
  deleteForEntity(entityId: string, model?: string): Promise<void>;

  /**
   * Delete all embeddings for a specific model.
   * Useful when switching models in single-model mode.
   */
  deleteByModel(model: string): Promise<void>;

  /**
   * Check if an entity has an embedding for the given model.
   */
  hasEmbedding(entityId: string, model: string): Promise<boolean>;

  /**
   * Get count of embeddings, optionally filtered by model.
   */
  getCount(model?: string): Promise<number>;

  /**
   * Delete all embeddings.
   */
  deleteAll(): Promise<void>;

  // === Resource Embedding Methods (WP 6.4) ===

  /**
   * Store an embedding for a resource.
   * Upserts if same (resource_id, model) pair exists.
   */
  storeForResource(
    resourceId: string,
    vector: number[],
    model: string
  ): Promise<ResourceEmbeddingRecord>;

  /**
   * Get embedding for a resource, optionally filtered by model.
   */
  getForResource(resourceId: string, model?: string): Promise<ResourceEmbeddingRecord | null>;

  /**
   * Find similar resources by cosine similarity.
   */
  findSimilarResources(
    vector: number[],
    model: string,
    limit: number,
    threshold?: number
  ): Promise<ResourceSimilarityResult[]>;

  /**
   * Delete embedding(s) for a resource.
   */
  deleteForResource(resourceId: string, model?: string): Promise<void>;
}

// Re-export types for convenience
export type { EmbeddingRecord, SimilarityResult, ResourceEmbeddingRecord, ResourceSimilarityResult };
