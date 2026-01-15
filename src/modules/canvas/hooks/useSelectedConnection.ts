import { useState, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { appState$ } from '@/store';
import type { Connection } from '@/shared/types';

export function useSelectedConnection() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Get the selected connection directly from the store using a selector
  const selectedConnection: Connection | null = useSelector(() => {
    if (!selectedConnectionId) return null;
    const connections = appState$.connections.items.get();
    return connections[selectedConnectionId] ?? null;
  });

  const selectConnection = useCallback((connectionId: string) => {
    setSelectedConnectionId(connectionId);
  }, []);

  const clearConnectionSelection = useCallback(() => {
    setSelectedConnectionId(null);
  }, []);

  return {
    selectedConnection,
    selectedConnectionId,
    selectConnection,
    clearConnectionSelection,
  };
}
