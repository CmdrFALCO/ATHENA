import initSqlJs, { type Database, type SqlValue } from '@/vendor/sql.js';
import { CREATE_TABLES } from './schema';
import {
  setupFTS5,
  migrateExistingToFTS,
  populateContentText,
  setupResources,
  upgradeConnections,
  setupResourcesFTS,
  migrateExistingResourcesToFTS,
  addResourceEmbeddingsSupport,
  setupMergeCandidates,
  setupResourceStructure,
  setupPreferenceSignals,
  setupKnowledgeSchemas,
} from './migrations';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

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
  // Initialize sql.js with custom build (FTS5 + JSON1 enabled)
  // WASM binary served from public/vendor/sql.js/
  const SQL = await initSqlJs({
    locateFile: (file) => `/vendor/sql.js/${file}`,
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

  // Set up FTS5 (idempotent)
  await setupFTS5(connection);

  // Set up resources table (idempotent)
  await setupResources(connection);

  // Upgrade connections table with node type columns (idempotent)
  await upgradeConnections(connection);

  // Set up Resources FTS5 (idempotent)
  await setupResourcesFTS(connection);
  await migrateExistingResourcesToFTS(connection);

  // Add resource_id support to embeddings table (idempotent)
  await addResourceEmbeddingsSupport(connection);

  // Set up merge candidates tables for entity resolution (WP 8.1, idempotent)
  await setupMergeCandidates(connection);

  // Add structure column to resources for document tree (WP 8.2, idempotent)
  await setupResourceStructure(connection);

  // Set up preference signals for preference learning (WP 8.4, idempotent)
  await setupPreferenceSignals(connection);

  // Set up knowledge schemas for schema templates (WP 8.5, idempotent)
  await setupKnowledgeSchemas(connection);

  // One-time migration: populate content_text for existing entities
  const populated = await populateContentText(connection, extractTextFromTiptap);
  if (populated > 0) {
    console.log(`Populated content_text for ${populated} entities`);

    // Rebuild FTS index with the new content_text values
    const indexed = await migrateExistingToFTS(connection);
    console.log(`Rebuilt FTS index with ${indexed} entities`);
  }

  return connection;
}

export function getDatabase(): DatabaseConnection | null {
  return dbInstance;
}

// Debug helper: check FTS index status
async function debugFTSStatus(): Promise<{
  resources: number;
  resourcesFTS: number;
  sample: unknown[];
}> {
  const db = getDatabase();
  if (!db) return { resources: 0, resourcesFTS: 0, sample: [] };

  const resourceCount = await db.exec<{ count: number }>('SELECT COUNT(*) as count FROM resources');
  const ftsCount = await db.exec<{ count: number }>('SELECT COUNT(*) as count FROM resources_fts');
  const sample = await db.exec<unknown>(
    'SELECT id, name, substr(extracted_text, 1, 100) as text_preview FROM resources_fts LIMIT 5'
  );

  return {
    resources: resourceCount[0]?.count ?? 0,
    resourcesFTS: ftsCount[0]?.count ?? 0,
    sample,
  };
}

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as {
    __ATHENA_DB__: () => DatabaseConnection | null;
    __ATHENA_FTS_DEBUG__: () => Promise<unknown>;
  }).__ATHENA_DB__ = getDatabase;
  (window as unknown as { __ATHENA_FTS_DEBUG__: () => Promise<unknown> }).__ATHENA_FTS_DEBUG__ = debugFTSStatus;
}
