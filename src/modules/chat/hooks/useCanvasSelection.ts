/**
 * useCanvasSelection - Hook to access canvas selection state for chat context
 * WP 7.6 - Spatial Awareness
 *
 * Bridges the canvas selection system with the chat context system,
 * allowing users to add selected nodes to their chat context.
 */

import { useMemo } from 'react';
import { useSelectedEntityIds, useNotes } from '@/store/hooks';

interface CanvasSelectionResult {
  /** Currently selected entity ID (first in selection, null if none) */
  selectedEntityId: string | null;
  /** Title of selected entity (null if none) */
  selectedEntityTitle: string | null;
  /** All selected entity IDs */
  selectedEntityIds: string[];
  /** Whether an entity is currently selected */
  hasSelection: boolean;
}

/**
 * Hook to access canvas selection state for chat context integration
 *
 * @returns Selection state including ID, title, and hasSelection flag
 */
export function useCanvasSelection(): CanvasSelectionResult {
  const selectedEntityIds = useSelectedEntityIds();
  const notes = useNotes();

  const result = useMemo(() => {
    if (selectedEntityIds.length === 0) {
      return {
        selectedEntityId: null,
        selectedEntityTitle: null,
        selectedEntityIds: [],
        hasSelection: false,
      };
    }

    // Use the first selected entity for the primary selection
    const primaryId = selectedEntityIds[0];
    const note = notes.find((n) => n.id === primaryId);

    return {
      selectedEntityId: primaryId ?? null,
      selectedEntityTitle: note?.title || null,
      selectedEntityIds,
      hasSelection: true,
    };
  }, [selectedEntityIds, notes]);

  return result;
}
