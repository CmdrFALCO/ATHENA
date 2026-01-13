import { useEffect, useState } from 'react';
import { appState$ } from './state';
import { entityActions, connectionActions } from './hooks';
import type { INoteAdapter, IConnectionAdapter } from '@/adapters';

interface InitializeOptions {
  noteAdapter: INoteAdapter;
  connectionAdapter: IConnectionAdapter;
}

export function useInitializeStore({ noteAdapter, connectionAdapter }: InitializeOptions) {
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
  }, [noteAdapter, connectionAdapter]);

  return { isReady, error };
}
