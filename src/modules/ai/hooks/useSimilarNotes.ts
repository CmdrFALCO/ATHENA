import { useState, useCallback, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import { useOptionalAI } from '../AIContext';
import { useAdapters } from '@/adapters';
import { devSettings$ } from '@/config';
import { DEFAULT_AI_SETTINGS, type AISettings } from '../types';
import type { SimilarityResult } from '@/adapters/IEmbeddingAdapter';
import type { Note } from '@/shared/types';

export interface SimilarNote {
  note: Note;
  similarity: number;
  similarityPercent: number; // 0-100 for display
}

export interface UseSimilarNotesResult {
  similarNotes: SimilarNote[];
  isLoading: boolean;
  error: string | null;
  hasEmbedding: boolean;
  findSimilar: (noteId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

export function useSimilarNotes(options?: {
  limit?: number;
  threshold?: number;
}): UseSimilarNotesResult {
  const ai = useOptionalAI();
  const adapters = useAdapters();

  // Get primitive values from devSettings to avoid object reference issues
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const aiBackend = useSelector(() => devSettings$.flags.aiBackend.get());

  // Build AI settings
  const aiSettings: AISettings = {
    ...DEFAULT_AI_SETTINGS,
    enabled: enableAI,
    provider: aiBackend,
  };

  const limit = options?.limit ?? aiSettings.suggestions.maxPerNote ?? 5;
  const threshold = options?.threshold ?? aiSettings.suggestions.confidenceThreshold ?? 0.7;

  const [similarNotes, setSimilarNotes] = useState<SimilarNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasEmbedding, setHasEmbedding] = useState(false);
  const currentNoteIdRef = useRef<string | null>(null);

  const findSimilar = useCallback(
    async (noteId: string) => {
      if (!aiSettings.enabled) {
        setError('AI is disabled');
        return;
      }

      if (!ai?.service) {
        setError('AI service not available');
        return;
      }

      setIsLoading(true);
      setError(null);
      currentNoteIdRef.current = noteId;
      setSimilarNotes([]);

      try {
        const model = ai.service.getActiveEmbeddingModel();
        if (!model) {
          setError('No embedding model configured');
          setIsLoading(false);
          return;
        }

        // Check if source note has an embedding
        const sourceEmbedding = await adapters.embeddings.getForEntity(noteId, model);
        setHasEmbedding(!!sourceEmbedding);

        if (!sourceEmbedding) {
          setError('Note has no embedding. Save the note to generate one.');
          setIsLoading(false);
          return;
        }

        // Find similar embeddings
        const results: SimilarityResult[] = await adapters.embeddings.findSimilar(
          sourceEmbedding.vector,
          model,
          limit,
          threshold,
          [noteId] // Exclude source note
        );

        // Load full note data for each result
        const notesWithSimilarity: SimilarNote[] = [];

        for (const result of results) {
          const note = await adapters.notes.getById(result.entity_id);
          if (note) {
            notesWithSimilarity.push({
              note,
              similarity: result.similarity,
              similarityPercent: Math.round(result.similarity * 100),
            });
          }
        }

        setSimilarNotes(notesWithSimilarity);
      } catch (err) {
        console.error('Failed to find similar notes:', err);
        setError(err instanceof Error ? err.message : 'Failed to find similar notes');
      } finally {
        setIsLoading(false);
      }
    },
    [ai?.service, aiSettings.enabled, adapters.embeddings, adapters.notes, limit, threshold]
  );

  const refresh = useCallback(async () => {
    if (currentNoteIdRef.current) {
      await findSimilar(currentNoteIdRef.current);
    }
  }, [findSimilar]);

  const clear = useCallback(() => {
    setSimilarNotes([]);
    setError(null);
    setHasEmbedding(false);
    currentNoteIdRef.current = null;
  }, []);

  return {
    similarNotes,
    isLoading,
    error,
    hasEmbedding,
    findSimilar,
    refresh,
    clear,
  };
}

// Optional hook that returns a default result when outside of the proper context
export function useOptionalSimilarNotes(options?: {
  limit?: number;
  threshold?: number;
}): UseSimilarNotesResult {
  try {
    return useSimilarNotes(options);
  } catch {
    return {
      similarNotes: [],
      isLoading: false,
      error: 'AI context not available',
      hasEmbedding: false,
      findSimilar: async () => {},
      refresh: async () => {},
      clear: () => {},
    };
  }
}
