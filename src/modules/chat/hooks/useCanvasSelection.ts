/**
 * useCanvasSelection - Hook to access canvas selection state for chat context
 * WP 7.6 - Spatial Awareness
 * WP 8.7.2 - Resource selection support
 *
 * Bridges the canvas selection system with the chat context system,
 * allowing users to add selected nodes and resources to their chat context.
 */

import { useMemo } from 'react';
import { useSelectedEntityIds, useSelectedResourceIds, useNotes } from '@/store/hooks';

interface CanvasSelectionResult {
  /** Currently selected entity ID (first in selection, null if none) */
  selectedEntityId: string | null;
  /** Title of selected entity (null if none) */
  selectedEntityTitle: string | null;
  /** All selected entity IDs */
  selectedEntityIds: string[];
  /** Whether an entity is currently selected */
  hasSelection: boolean;
  /** All selected resource IDs (WP 8.7.2) */
  selectedResourceIds: string[];
  /** Whether any resource is currently selected (WP 8.7.2) */
  hasResourceSelection: boolean;
}

/**
 * Hook to access canvas selection state for chat context integration
 *
 * @returns Selection state including entity IDs, resource IDs, titles, and flags
 */
export function useCanvasSelection(): CanvasSelectionResult {
  const selectedEntityIds = useSelectedEntityIds();
  const selectedResourceIds = useSelectedResourceIds();
  const notes = useNotes();

  const result = useMemo(() => {
    const hasEntitySelection = selectedEntityIds.length > 0;
    const hasResourceSelection = selectedResourceIds.length > 0;

    if (!hasEntitySelection) {
      return {
        selectedEntityId: null,
        selectedEntityTitle: null,
        selectedEntityIds: [],
        hasSelection: false,
        selectedResourceIds,
        hasResourceSelection,
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
      selectedResourceIds,
      hasResourceSelection,
    };
  }, [selectedEntityIds, selectedResourceIds, notes]);

  return result;
}
