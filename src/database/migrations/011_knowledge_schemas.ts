import type { DatabaseConnection } from '../init';
import { BUILT_IN_SCHEMAS } from '@/modules/schema/data/builtInSchemas';

/**
 * Migration 011: Create knowledge_schemas table (WP 8.5)
 *
 * Stores schema templates that guide AI extraction toward consistent
 * entity/relationship types. Includes built-in schemas for common use cases.
 */
export async function setupKnowledgeSchemas(db: DatabaseConnection): Promise<void> {
  // Create schemas table
  await db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_schemas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      note_types TEXT NOT NULL,
      connection_types TEXT NOT NULL,
      extraction_hints TEXT,
      is_built_in INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0
    )
  `);

  // Index for quick lookup
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_schemas_builtin
    ON knowledge_schemas(is_built_in)
  `);

  // Insert built-in schemas if they don't exist
  const now = new Date().toISOString();

  for (const schema of BUILT_IN_SCHEMAS) {
    const existing = await db.exec<{ id: string }>(
      `SELECT id FROM knowledge_schemas WHERE id = ?`,
      [schema.id]
    );

    if (existing.length === 0) {
      await db.run(
        `INSERT INTO knowledge_schemas
         (id, name, description, note_types, connection_types, extraction_hints, is_built_in, created_at, usage_count)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0)`,
        [
          schema.id,
          schema.name,
          schema.description,
          JSON.stringify(schema.noteTypes),
          JSON.stringify(schema.connectionTypes),
          JSON.stringify(schema.extractionHints),
          now,
        ]
      );
    }
  }

  console.log('[Migration] knowledge_schemas table ready with built-in schemas');
}
