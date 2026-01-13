import { useEffect, useState } from 'react';
import { initDatabase } from './database';
import {
  AdapterProvider,
  SQLiteNoteAdapter,
  SQLiteConnectionAdapter,
  SQLiteEmbeddingAdapter,
  SQLiteClusterAdapter,
  useNoteAdapter,
  useConnectionAdapter,
  useClusterAdapter,
  type Adapters,
} from './adapters';
import {
  useNotes,
  useConnections,
  useFeatureFlag,
  useInitializeStore,
  uiActions,
  entityActions,
} from './store';
import { DevSettingsPanel } from './config';

function MainContent() {
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();
  const clusterAdapter = useClusterAdapter();
  const { isReady, error } = useInitializeStore({ noteAdapter, connectionAdapter, clusterAdapter });

  const notes = useNotes();
  const connections = useConnections();
  const showDebugInfo = useFeatureFlag('showDebugInfo');

  const [testStatus, setTestStatus] = useState<string>('');

  const runCreateTest = async () => {
    try {
      setTestStatus('Creating test note...');

      const note = await noteAdapter.create({
        type: 'note',
        subtype: 'zettelkasten',
        title: `Test Note ${Date.now()}`,
        content: [{ type: 'paragraph', content: 'Created via state layer test' }],
        metadata: { tags: ['test'] },
        position_x: Math.random() * 400,
        position_y: Math.random() * 400,
      });

      // Re-fetch to update store (in a real app, we'd sync automatically)
      const allNotes = await noteAdapter.getAll();
      entityActions.setNotes(allNotes);

      setTestStatus(`Created note: ${note.title}`);
    } catch (err) {
      setTestStatus(`Error: ${err}`);
    }
  };

  if (error) {
    return (
      <div className="text-red-500 p-8">
        <h2 className="text-xl font-bold mb-2">Initialization Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
      <h2 className="text-lg font-semibold mb-4">State Layer Test</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={runCreateTest}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Create Test Note
        </button>
        <button
          onClick={() => uiActions.openDevSettings()}
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
        >
          DevSettings
        </button>
      </div>

      {testStatus && <div className="text-sm mb-4 text-gray-300">{testStatus}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Notes ({notes.length})</h3>
          <ul className="text-sm text-gray-400 max-h-40 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className="truncate">
                - {n.title}
              </li>
            ))}
            {notes.length === 0 && <li className="italic">No notes yet</li>}
          </ul>
        </div>
        <div>
          <h3 className="font-medium mb-2">Connections ({connections.length})</h3>
          <ul className="text-sm text-gray-400 max-h-40 overflow-y-auto">
            {connections.map((c) => (
              <li key={c.id}>
                - <span className={`text-connection-${c.color}`}>{c.color}</span>
              </li>
            ))}
            {connections.length === 0 && <li className="italic">No connections yet</li>}
          </ul>
        </div>
      </div>

      {showDebugInfo && (
        <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-500">
          <div>Debug: showDebugInfo = true</div>
          <div>Notes in store: {notes.length}</div>
          <div>Connections in store: {connections.length}</div>
        </div>
      )}
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

        <MainContent />

        <p className="text-sm text-gray-600 mt-8">
          WP 0.5 Complete — Clusters Added! | Ctrl+Shift+D for DevSettings
        </p>
      </div>

      {/* DevSettings Modal */}
      <DevSettingsPanel />
    </AdapterProvider>
  );
}

export default App;
