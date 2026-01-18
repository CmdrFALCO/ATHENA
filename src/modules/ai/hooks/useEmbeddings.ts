import { useCallback, useEffect } from 'react';
import { useEmbeddingAdapter } from '@/adapters/hooks';
import { useAI, useOptionalAI } from './useAIContext';
import type { EmbeddingRecord, SimilarityResult } from '@/adapters/IEmbeddingAdapter';

export interface UseEmbeddingsResult {
  /** Embed text and store the result for an entity */
  embedNote: (noteId: string, content: string) => Promise<EmbeddingRecord | null>;

  /** Find similar notes based on an entity's embedding */
  findSimilar: (noteId: string, limit?: number, threshold?: number) => Promise<SimilarityResult[]>;

  /** Get embedding status for a note */
  getEmbeddingStatus: (noteId: string) => Promise<{
    hasEmbedding: boolean;
    model: string | null;
  }>;

  /** Delete embedding(s) for a note */
  deleteEmbedding: (noteId: string, model?: string) => Promise<void>;

  /** Get embedding count */
  getEmbeddingCount: (model?: string) => Promise<number>;

  /** Check if embedding exists */
  hasEmbedding: (noteId: string, model: string) => Promise<boolean>;
}

/**
 * Hook for embedding operations.
 * Requires both AIProvider and AdapterProvider in the component tree.
 */
export function useEmbeddings(): UseEmbeddingsResult {
  const { service } = useAI();
  const embeddingAdapter = useEmbeddingAdapter();

  // Set the embedding adapter on the service when the hook mounts
  useEffect(() => {
    service.setEmbeddingAdapter(embeddingAdapter);
  }, [service, embeddingAdapter]);

  const embedNote = useCallback(
    async (noteId: string, content: string): Promise<EmbeddingRecord | null> => {
      return service.embedAndStore(noteId, content);
    },
    [service]
  );

  const findSimilar = useCallback(
    async (noteId: string, limit = 5, threshold = 0.7): Promise<SimilarityResult[]> => {
      return service.findSimilarNotes(noteId, limit, threshold);
    },
    [service]
  );

  const getEmbeddingStatus = useCallback(
    async (noteId: string): Promise<{ hasEmbedding: boolean; model: string | null }> => {
      const model = service.getActiveEmbeddingModel();
      if (!model) {
        return { hasEmbedding: false, model: null };
      }

      const has = await embeddingAdapter.hasEmbedding(noteId, model);
      return { hasEmbedding: has, model };
    },
    [service, embeddingAdapter]
  );

  const deleteEmbedding = useCallback(
    async (noteId: string, model?: string): Promise<void> => {
      return embeddingAdapter.deleteForEntity(noteId, model);
    },
    [embeddingAdapter]
  );

  const getEmbeddingCount = useCallback(
    async (model?: string): Promise<number> => {
      return embeddingAdapter.getCount(model);
    },
    [embeddingAdapter]
  );

  const hasEmbedding = useCallback(
    async (noteId: string, model: string): Promise<boolean> => {
      return embeddingAdapter.hasEmbedding(noteId, model);
    },
    [embeddingAdapter]
  );

  return {
    embedNote,
    findSimilar,
    getEmbeddingStatus,
    deleteEmbedding,
    getEmbeddingCount,
    hasEmbedding,
  };
}

/**
 * Optional version of useEmbeddings that returns null if outside providers.
 * Useful for components that may or may not have AI/Adapter context.
 */
export function useOptionalEmbeddings(): UseEmbeddingsResult | null {
  const aiContext = useOptionalAI();

  // Can't use hooks conditionally, so we always call useEmbeddingAdapter
  // but return null if AI context is missing
  try {
    const embeddingAdapter = useEmbeddingAdapter();

    if (!aiContext) {
      return null;
    }

    const { service } = aiContext;

    // Set the embedding adapter on the service
    service.setEmbeddingAdapter(embeddingAdapter);

    return {
      embedNote: async (noteId, content) => service.embedAndStore(noteId, content),
      findSimilar: async (noteId, limit = 5, threshold = 0.7) =>
        service.findSimilarNotes(noteId, limit, threshold),
      getEmbeddingStatus: async (noteId) => {
        const model = service.getActiveEmbeddingModel();
        if (!model) return { hasEmbedding: false, model: null };
        const has = await embeddingAdapter.hasEmbedding(noteId, model);
        return { hasEmbedding: has, model };
      },
      deleteEmbedding: async (noteId, model) =>
        embeddingAdapter.deleteForEntity(noteId, model),
      getEmbeddingCount: async (model) => embeddingAdapter.getCount(model),
      hasEmbedding: async (noteId, model) => embeddingAdapter.hasEmbedding(noteId, model),
    };
  } catch {
    // AdapterProvider not available
    return null;
  }
}
