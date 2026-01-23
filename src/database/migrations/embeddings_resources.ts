import type { DatabaseConnection } from '../init';

/**
 * Extend embeddings table to support resources.
 * Resources use the same embedding table with resource_id instead of entity_id.
 *
 * Note: As of WP 6.5, resource_id is included in the base schema (schema.ts).
 * This migration is kept for backwards compatibility with existing databases
 * that might have been created before the schema was updated.
 *
 * After this migration:
 * - Embeddings can have either entity_id (existing) or resource_id (new)
 * - Both columns are nullable, but at least one should be set
 */
export async function addResourceEmbeddingsSupport(db: DatabaseConnection): Promise<void> {
  // Check if column already exists (idempotent)
  const columns = await db.exec<{ name: string }>("SELECT name FROM pragma_table_info('embeddings')");
  const hasResourceId = columns.some((col) => col.name === 'resource_id');

  if (!hasResourceId) {
    // Legacy path: only runs if schema didn't include resource_id
    await db.run('ALTER TABLE embeddings ADD COLUMN resource_id TEXT');
    await db.run('CREATE INDEX IF NOT EXISTS idx_embeddings_resource ON embeddings(resource_id)');
    console.log('[DB] Added resource_id column to embeddings table');
  }
}
