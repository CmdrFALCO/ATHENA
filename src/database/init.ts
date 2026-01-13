import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

export interface DatabaseConnection {
  exec<T = unknown>(sql: string): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

let dbInstance: DatabaseConnection | null = null;
let initPromise: Promise<DatabaseConnection> | null = null;

export async function initDatabase(): Promise<DatabaseConnection> {
  // Return existing instance if already initialized
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing init promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  initPromise = createDatabase();
  dbInstance = await initPromise;
  return dbInstance;
}

async function createDatabase(): Promise<DatabaseConnection> {
  // Load the async SQLite WASM module
  const module = await SQLiteAsyncESMFactory();
  const sqlite3 = SQLite.Factory(module);

  // Register IndexedDB VFS for persistence
  const vfs = new IDBBatchAtomicVFS('athena-vfs');
  sqlite3.vfs_register(vfs, true);

  // Open database with the registered VFS
  const db = await sqlite3.open_v2('athena.db');

  return {
    async exec<T = unknown>(sql: string): Promise<T[]> {
      const results: T[] = [];
      await sqlite3.exec(db, sql, (row, columns) => {
        const obj = {} as Record<string, unknown>;
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        results.push(obj as T);
      });
      return results;
    },

    async run(sql: string, params?: unknown[]): Promise<void> {
      if (params && params.length > 0) {
        // Use prepared statement for parameterized queries
        for await (const stmt of sqlite3.statements(db, sql)) {
          sqlite3.bind_collection(stmt, params as SQLite.SQLiteCompatibleType[]);
          while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
            // Execute statement
          }
        }
      } else {
        await sqlite3.exec(db, sql);
      }
    },

    async close(): Promise<void> {
      await sqlite3.close(db);
      dbInstance = null;
      initPromise = null;
    },
  };
}

export function getDatabase(): DatabaseConnection | null {
  return dbInstance;
}
