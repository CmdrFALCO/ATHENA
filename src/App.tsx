import { useEffect, useState } from 'react';
import { initDatabase } from './database';
import {
  AdapterProvider,
  SQLiteNoteAdapter,
  SQLiteConnectionAdapter,
  SQLiteEmbeddingAdapter,
  useNoteAdapter,
  useConnectionAdapter,
  type Adapters,
} from './adapters';
import type { Note, Connection } from './shared/types';

function TestPanel() {
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [status, setStatus] = useState<string>('');

  const runTests = async () => {
    try {
      // Create two notes
      setStatus('Creating notes...');
      const note1 = await noteAdapter.create({
        type: 'note',
        subtype: 'zettelkasten',
        title: 'First Note',
        content: [{ type: 'paragraph', content: 'Hello ATHENA' }],
        metadata: { tags: ['test'] },
        position_x: 100,
        position_y: 100,
      });

      const note2 = await noteAdapter.create({
        type: 'note',
        subtype: 'zettelkasten',
        title: 'Second Note',
        content: [{ type: 'paragraph', content: 'Connected thought' }],
        metadata: { tags: ['test'] },
        position_x: 300,
        position_y: 100,
      });

      // Create connection
      setStatus('Creating connection...');
      await connectionAdapter.create({
        source_id: note1.id,
        target_id: note2.id,
        type: 'explicit',
        color: 'blue',
        label: 'relates to',
        confidence: null,
        created_by: 'user',
      });

      // Fetch all
      setStatus('Fetching data...');
      const allNotes = await noteAdapter.getAll();
      const allConnections = await connectionAdapter.getAll();

      setNotes(allNotes);
      setConnections(allConnections);
      setStatus('All tests passed!');
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
      <h2 className="text-lg font-semibold mb-4">Adapter Tests</h2>

      <button
        onClick={runTests}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
      >
        Run Tests
      </button>

      <div className="text-sm mb-4">{status}</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Notes ({notes.length})</h3>
          <ul className="text-sm text-gray-400">
            {notes.map((n) => (
              <li key={n.id}>- {n.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium mb-2">Connections ({connections.length})</h3>
          <ul className="text-sm text-gray-400">
            {connections.map((c) => (
              <li key={c.id}>
                - <span className={`text-connection-${c.color}`}>{c.color}</span>:{' '}
                {c.label ?? '(no label)'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

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
        });
      } catch (err) {
        setError(String(err));
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-red-500 flex items-center justify-center">
        Error: {error}
      </div>
    );
  }

  if (!adapters) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdapterProvider adapters={adapters}>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-2">ATHENA</h1>
        <p className="text-gray-400 mb-8">The Second Brain You Trust</p>
        <TestPanel />
        <p className="text-sm text-gray-600 mt-8">WP 0.3 Complete</p>
      </div>
    </AdapterProvider>
  );
}

export default App;
