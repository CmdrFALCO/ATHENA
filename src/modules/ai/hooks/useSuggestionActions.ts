import { useCallback, useState } from 'react';
import { useConnectionAdapter } from '@/adapters';
import { connectionActions, suggestionActions } from '@/store';
import type { Connection } from '@/shared/types';

export interface UseSuggestionActionsResult {
  isAccepting: boolean;
  error: string | null;
  acceptSuggestion: (
    suggestionId: string,
    sourceId: string,
    targetId: string,
    similarity: number
  ) => Promise<Connection | null>;
  dismissSuggestion: (suggestionId: string) => void;
}

/**
 * Hook for accepting or dismissing AI suggestions.
 * Accept flow: Creates a persisted blue connection, adds to store, removes suggestion.
 * Dismiss flow: Just removes the suggestion from state.
 */
export function useSuggestionActions(): UseSuggestionActionsResult {
  const connectionAdapter = useConnectionAdapter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptSuggestion = useCallback(
    async (
      suggestionId: string,
      sourceId: string,
      targetId: string,
      similarity: number
    ): Promise<Connection | null> => {
      setIsAccepting(true);
      setError(null);

      try {
        // Check if connection already exists between these entities
        const existing = await connectionAdapter.getConnectionsBetween(sourceId, targetId);
        if (existing.length > 0) {
          // Connection already exists, just remove the suggestion
          suggestionActions.removeSuggestion(suggestionId);
          return existing[0];
        }

        // Create persisted connection (blue)
        const connection = await connectionAdapter.create({
          source_id: sourceId,
          target_id: targetId,
          type: 'semantic',           // Was AI-suggested
          color: 'blue',              // Now explicit/accepted
          label: null,                // User can add label later
          confidence: similarity,     // Preserve the similarity score
          created_by: 'ai',           // Track origin
        });

        // Add to Legend-State store
        connectionActions.addConnection(connection);

        // Remove suggestion from state
        suggestionActions.removeSuggestion(suggestionId);

        return connection;
      } catch (err) {
        console.error('Failed to accept suggestion:', err);
        const message = err instanceof Error ? err.message : 'Failed to accept suggestion';
        setError(message);
        return null;
      } finally {
        setIsAccepting(false);
      }
    },
    [connectionAdapter]
  );

  const dismissSuggestion = useCallback((suggestionId: string) => {
    // Simply remove from state - dismissed suggestions are not persisted
    suggestionActions.removeSuggestion(suggestionId);
  }, []);

  return {
    isAccepting,
    error,
    acceptSuggestion,
    dismissSuggestion,
  };
}
