import { useCallback, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import { useOptionalAI } from './useAIContext';
import { useAdapters } from '@/adapters';
import { devSettings$ } from '@/config';
import {
  usePendingSuggestions,
  useSuggestionsGenerating,
  useCanvasConfig,
  suggestionActions,
  type SuggestedConnection,
} from '@/store';
import { SuggestionService, type SuggestionConfig } from '../SuggestionService';

export interface UseSuggestionsResult {
  suggestions: SuggestedConnection[];
  isGenerating: boolean;
  error: string | null;
  generateForNote: (noteId: string) => Promise<void>;
  generateForCanvas: (visibleNoteIds: string[]) => Promise<void>;
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}

export function useSuggestions(): UseSuggestionsResult {
  const ai = useOptionalAI();
  const adapters = useAdapters();

  // Get settings from devSettings
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const showGreenConnections = useSelector(() => devSettings$.flags.showGreenConnections.get());

  // Get canvas config for suggestion behavior
  const showAiSuggestions = useCanvasConfig('showAiSuggestions');

  // Get suggestions from store
  const suggestions = usePendingSuggestions();
  const isGenerating = useSuggestionsGenerating();

  // Track error state locally (not persisted)
  const errorRef = useRef<string | null>(null);

  // Create suggestion service lazily
  const getService = useCallback((): SuggestionService | null => {
    if (!ai?.service) {
      return null;
    }
    return new SuggestionService(ai.service, adapters.connections);
  }, [ai?.service, adapters.connections]);

  // Get config from AI settings defaults (could be expanded to read from devSettings)
  const getConfig = useCallback((): SuggestionConfig => {
    return {
      confidenceThreshold: 0.7,
      maxPerNote: 5,
    };
  }, []);

  const generateForNote = useCallback(
    async (noteId: string) => {
      // Check prerequisites
      if (!enableAI) {
        errorRef.current = 'AI is disabled';
        return;
      }

      if (!showGreenConnections) {
        errorRef.current = 'Green connections are disabled';
        return;
      }

      const service = getService();
      if (!service) {
        errorRef.current = 'AI service not available';
        return;
      }

      // Start generating
      suggestionActions.setGenerating(true);
      errorRef.current = null;

      try {
        const config = getConfig();
        const newSuggestions = await service.generateForNote(noteId, config);

        // Update store with new suggestions
        // In 'always' mode, accumulate suggestions; in 'on-select' mode, replace
        if (showAiSuggestions === 'always') {
          suggestionActions.appendSuggestions(newSuggestions, noteId);
        } else {
          suggestionActions.setSuggestions(newSuggestions, noteId);
        }
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
        errorRef.current = err instanceof Error ? err.message : 'Failed to generate suggestions';
        suggestionActions.clearSuggestions();
      } finally {
        suggestionActions.setGenerating(false);
      }
    },
    [enableAI, showGreenConnections, showAiSuggestions, getService, getConfig]
  );

  const generateForCanvas = useCallback(
    async (visibleNoteIds: string[]) => {
      if (!enableAI) {
        errorRef.current = 'AI is disabled';
        return;
      }

      if (!showGreenConnections) {
        errorRef.current = 'Green connections are disabled';
        return;
      }

      const service = getService();
      if (!service) {
        errorRef.current = 'AI service not available';
        return;
      }

      suggestionActions.setGenerating(true);
      errorRef.current = null;

      try {
        const config = getConfig();
        const newSuggestions = await service.generateForCanvas(visibleNoteIds, config);

        // For canvas-wide generation, use 'canvas' as source
        suggestionActions.setSuggestions(newSuggestions, 'canvas');
      } catch (err) {
        console.error('Failed to generate canvas suggestions:', err);
        errorRef.current = err instanceof Error ? err.message : 'Failed to generate suggestions';
        suggestionActions.clearSuggestions();
      } finally {
        suggestionActions.setGenerating(false);
      }
    },
    [enableAI, showGreenConnections, getService, getConfig]
  );

  const dismissSuggestion = useCallback((id: string) => {
    suggestionActions.dismissSuggestion(id);
  }, []);

  const clearSuggestions = useCallback(() => {
    suggestionActions.clearSuggestions();
  }, []);

  return {
    suggestions,
    isGenerating,
    error: errorRef.current,
    generateForNote,
    generateForCanvas,
    dismissSuggestion,
    clearSuggestions,
  };
}

// Optional hook for use outside AI provider
export function useOptionalSuggestions(): UseSuggestionsResult {
  try {
    return useSuggestions();
  } catch {
    return {
      suggestions: [],
      isGenerating: false,
      error: 'AI context not available',
      generateForNote: async () => {},
      generateForCanvas: async () => {},
      dismissSuggestion: () => {},
      clearSuggestions: () => {},
    };
  }
}
