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
        let notes = await noteAdapter.getAll();

        // Create sample notes for testing if database is empty
        if (notes.length === 0) {
          const sampleNotes = [
            {
              title: 'Welcome to ATHENA',
              type: 'note' as const,
              subtype: 'zettel',
              content: [],
              metadata: {},
              position_x: 0,
              position_y: 0,
            },
            {
              title: 'Research on Battery Safety',
              type: 'note' as const,
              subtype: 'literature',
              content: [],
              metadata: {},
              position_x: 100,
              position_y: 0,
            },
            {
              title: 'Project Planning Ideas',
              type: 'note' as const,
              subtype: 'fleeting',
              content: [],
              metadata: {},
              position_x: 200,
              position_y: 0,
            },
          ];

          for (const noteData of sampleNotes) {
            await noteAdapter.create(noteData);
          }

          // Reload notes after creating samples
          notes = await noteAdapter.getAll();
        }

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
