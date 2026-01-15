import { useMemo, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { useNotes, useSelectedEntityIds, uiActions } from '@/store';

export function useNotesAsNodes() {
  const notes = useNotes();
  const selectedEntityIds = useSelectedEntityIds();

  // Get the first selected entity ID (single selection for now)
  const selectedNodeId = selectedEntityIds.length > 0 ? selectedEntityIds[0] : null;

  // Only depend on notes - selection state is handled in EntityNode
  const nodes = useMemo<Node[]>(() => {
    return notes.map((note, index) => ({
      id: note.id,
      type: 'entity',
      // Initial grid layout - will be replaced with persisted positions in WP 2.3
      position: {
        x: note.position_x ?? (index % 4) * 250,
        y: note.position_y ?? Math.floor(index / 4) * 150,
      },
      data: {
        entityId: note.id,
        title: note.title,
        type: note.type,
      },
    }));
  }, [notes]);

  const onNodeSelect = useCallback((entityId: string) => {
    uiActions.selectEntity(entityId);
  }, []);

  return { nodes, onNodeSelect, selectedNodeId };
}
