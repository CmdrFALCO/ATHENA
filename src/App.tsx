import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { initDatabase } from './database';
import {
  AdapterProvider,
  SQLiteNoteAdapter,
  SQLiteConnectionAdapter,
  SQLiteEmbeddingAdapter,
  SQLiteClusterAdapter,
  type Adapters,
} from './adapters';
import { router } from './app/routes';

function App() {
  const [adapters, setAdapters] = useState<Adapters | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const db = await initDatabase();
        setAdapters({
          notes: new SQLiteNoteAdapter(db),
          connections: new SQLiteConnectionAdapter(db),
          embeddings: new SQLiteEmbeddingAdapter(db),
          clusters: new SQLiteClusterAdapter(db),
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
      <RouterProvider router={router} />
    </AdapterProvider>
  );
}

export default App;
