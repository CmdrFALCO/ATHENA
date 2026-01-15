import { useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import { usePendingSuggestions, useFeatureFlag } from '@/store';
import type { ConnectionEdgeData } from '../components/ConnectionEdge';

/**
 * Hook that converts pending suggestions to React Flow edges.
 * Only returns edges when showGreenConnections is enabled.
 */
export function useSuggestedEdges() {
  const suggestions = usePendingSuggestions();
  const showGreenConnections = useFeatureFlag('showGreenConnections');
  const enableAI = useFeatureFlag('enableAI');

  const edges = useMemo<Edge<ConnectionEdgeData>[]>(() => {
    // Don't show suggestions if AI or green connections are disabled
    if (!enableAI || !showGreenConnections) {
      return [];
    }

    return suggestions.map((suggestion) => ({
      id: suggestion.id,
      source: suggestion.sourceId,
      target: suggestion.targetId,
      type: 'connection',
      data: {
        connectionId: suggestion.id,
        label: null, // Will show similarity percentage via isSuggested
        color: 'green' as const,
        isSuggested: true,
        similarity: suggestion.similarity,
      },
    }));
  }, [suggestions, showGreenConnections, enableAI]);

  return { edges };
}
