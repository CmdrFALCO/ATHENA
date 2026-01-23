import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { initDatabase } from './database';
import {
  AdapterProvider,
  SQLiteNoteAdapter,
  SQLiteConnectionAdapter,
  SQLiteEmbeddingAdapter,
  SQLiteClusterAdapter,
  SQLiteSearchAdapter,
  SQLiteResourceAdapter,
  type Adapters,
} from './adapters';
import { router } from './app/routes';
import { AIProvider } from './modules/ai';
import { chatActions } from './modules/chat';

// Import validation store to expose window.__ATHENA_VALIDATION__
import './modules/validation/store/validationActions';

function App() {
  const [adapters, setAdapters] = useState<Adapters | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const db = await initDatabase();
        const noteAdapter = new SQLiteNoteAdapter(db);
        const embeddingAdapter = new SQLiteEmbeddingAdapter(db);
        setAdapters({
          notes: noteAdapter,
          connections: new SQLiteConnectionAdapter(db),
          embeddings: embeddingAdapter,
          clusters: new SQLiteClusterAdapter(db),
          search: new SQLiteSearchAdapter(db, embeddingAdapter, noteAdapter),
          resources: new SQLiteResourceAdapter(db),
        });

        // WP 7.1: Load chat threads from IndexedDB
        chatActions.loadThreads().catch((err) => {
          console.error('Failed to load chat threads:', err);
        });
      } catch (err) {
        setError(String(err));
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-athena-bg text-red-500 flex items-center justify-center">
        Error: {error}
      </div>
    );
  }

  if (!adapters) {
    return (
      <div className="min-h-screen bg-athena-bg text-athena-text flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdapterProvider adapters={adapters}>
      <AIProvider>
        <RouterProvider router={router} />
      </AIProvider>
    </AdapterProvider>
  );
}

export default App;
