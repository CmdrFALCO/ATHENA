import { useEffect, useState } from 'react';
import { initDatabase } from './database';

function App() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [testResult, setTestResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function testDb() {
      try {
        const db = await initDatabase();

        // Create test table
        await db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value TEXT)');

        // Insert
        await db.run('INSERT INTO test (value) VALUES (?)', ['Hello ATHENA']);

        // Read back
        const results = await db.exec<{ value: string }>(
          'SELECT value FROM test ORDER BY id DESC LIMIT 1'
        );

        setTestResult(results[0]?.value ?? 'No data');
        setDbStatus('ready');
      } catch (err) {
        console.error('Database error:', err);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setDbStatus('error');
      }
    }

    testDb();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ATHENA</h1>
        <p className="text-gray-400 mb-8">The Second Brain You Trust</p>

        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold mb-4">Database Status</h2>

          <div className="flex items-center justify-center gap-2 mb-4">
            {dbStatus === 'loading' && (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span>Initializing...</span>
              </>
            )}
            {dbStatus === 'ready' && (
              <>
                <span className="text-green-500">✓</span>
                <span>SQLite WASM Ready</span>
              </>
            )}
            {dbStatus === 'error' && (
              <>
                <span className="text-red-500">✗</span>
                <span>Database Error</span>
              </>
            )}
          </div>

          {dbStatus === 'ready' && (
            <div className="text-sm text-gray-400">
              <p>
                Test value: <span className="text-white">{testResult}</span>
              </p>
            </div>
          )}

          {dbStatus === 'error' && errorMessage && (
            <div className="text-sm text-red-400 mt-2">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mt-8">WP 0.2 Complete</p>
      </div>
    </div>
  );
}

export default App;
