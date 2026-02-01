import type { DatabaseConnection } from '../init';

/**
 * Migration 009: Add structure column to resources table (WP 8.2)
 *
 * Stores hierarchical document tree (JSON) for reasoning-based retrieval.
 * Enables AI to navigate document structure instead of flat similarity search.
 */
export async function setupResourceStructure(db: DatabaseConnection): Promise<void> {
  // SQLite doesn't support ADD COLUMN IF NOT EXISTS, so check first
  const columns = await db.exec<{ name: string }>(`PRAGMA table_info(resources)`);
  const hasStructure = columns.some((col) => col.name === 'structure');

  if (!hasStructure) {
    await db.run(`ALTER TABLE resources ADD COLUMN structure TEXT`);
  }
}
