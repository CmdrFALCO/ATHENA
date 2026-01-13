import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { CREATE_TABLES } from './schema';

export interface DatabaseConnection {
  exec<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
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
  // Initialize sql.js - load WASM from CDN
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  // Create in-memory database
  // TODO: Implement persistence with IndexedDB in a future WP
  const db: Database = new SQL.Database();

  const connection: DatabaseConnection = {
    async exec<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
      const results: T[] = [];

      try {
        const stmt = db.prepare(sql);
        if (params && params.length > 0) {
          stmt.bind(params as SqlValue[]);
        }

        while (stmt.step()) {
          const row = stmt.getAsObject();
          results.push(row as T);
        }

        stmt.free();
      } catch (error) {
        console.error('SQL exec error:', error, sql, params);
        throw error;
      }

      return results;
    },

    async run(sql: string, params?: unknown[]): Promise<void> {
      try {
        if (params && params.length > 0) {
          db.run(sql, params as SqlValue[]);
        } else {
          db.run(sql);
        }
      } catch (error) {
        console.error('SQL run error:', error, sql, params);
        throw error;
      }
    },

    async close(): Promise<void> {
      db.close();
      dbInstance = null;
      initPromise = null;
    },
  };

  // Run schema creation
  await connection.run(CREATE_TABLES);

  return connection;
}

export function getDatabase(): DatabaseConnection | null {
  return dbInstance;
}
