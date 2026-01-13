import { useEffect, useState } from 'react';
import { appState$ } from './state';
import { entityActions, connectionActions, clusterActions } from './hooks';
import type { INoteAdapter, IConnectionAdapter, IClusterAdapter } from '@/adapters';

interface InitializeOptions {
  noteAdapter: INoteAdapter;
  connectionAdapter: IConnectionAdapter;
  clusterAdapter: IClusterAdapter;
}

export function useInitializeStore({
  noteAdapter,
  connectionAdapter,
  clusterAdapter,
}: InitializeOptions) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        entityActions.setLoading(true);

        // Load notes from SQLite
        const notes = await noteAdapter.getAll();
        entityActions.setNotes(notes);

        // Load connections from SQLite
        const connections = await connectionAdapter.getAll();
        connectionActions.setConnections(connections);

        // Load clusters from SQLite
        const clusters = await clusterAdapter.getAll();
        clusterActions.setClusters(clusters);

        // Mark as initialized
        appState$.initialized.set(true);
        setIsReady(true);
      } catch (err) {
        setError(String(err));
        console.error('Failed to initialize store:', err);
      } finally {
        entityActions.setLoading(false);
      }
    }

    initialize();
  }, [noteAdapter, connectionAdapter, clusterAdapter]);

  return { isReady, error };
}
