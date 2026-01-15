import { useCallback } from 'react';
import { useNoteAdapter } from '@/adapters';
import { entityActions } from '@/store';

export function useNodePositionSync() {
  const noteAdapter = useNoteAdapter();

  const saveNodePosition = useCallback(
    async (entityId: string, x: number, y: number) => {
      try {
        // Round to integers for cleaner storage
        const position_x = Math.round(x);
        const position_y = Math.round(y);

        // Persist to database
        await noteAdapter.update(entityId, { position_x, position_y });

        // Update store (so it survives re-renders before next full load)
        entityActions.updateNote(entityId, { position_x, position_y });
      } catch (error) {
        console.error('Failed to save node position:', error);
      }
    },
    [noteAdapter]
  );

  return { saveNodePosition };
}
