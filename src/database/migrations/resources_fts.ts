import type { DatabaseConnection } from '../init';

/**
 * Sets up FTS5 full-text search for resources.
 * Mirrors the pattern from entities_fts.
 *
 * Indexed fields:
 * - name: Resource file name
 * - user_notes: User's annotations
 * - extracted_text: Text extracted from content
 *
 * Triggers keep FTS in sync with the source table, handling:
 * - INSERT: Add new valid resources to FTS
 * - UPDATE: Re-index on content changes
 * - DELETE: Remove from FTS
 * - Soft delete: Remove when invalid_at is set
 */
export async function setupResourcesFTS(db: DatabaseConnection): Promise<void> {
  // Create FTS5 virtual table
  await db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
      id UNINDEXED,
      name,
      user_notes,
      extracted_text,
      tokenize='porter unicode61'
    )
  `);

  // Drop existing triggers first (ignore errors if they don't exist)
  const triggerNames = [
    'resources_fts_insert',
    'resources_fts_update',
    'resources_fts_delete',
    'resources_fts_soft_delete',
  ];

  for (const trigger of triggerNames) {
    try {
      await db.run(`DROP TRIGGER IF EXISTS ${trigger}`);
    } catch {
      // Ignore - trigger may not exist
    }
  }

  // INSERT trigger: Add to FTS when a valid resource is inserted
  await db.run(`
    CREATE TRIGGER resources_fts_insert AFTER INSERT ON resources
    WHEN NEW.invalid_at IS NULL
    BEGIN
      INSERT INTO resources_fts(id, name, user_notes, extracted_text)
      VALUES (NEW.id, NEW.name, NEW.user_notes, NEW.extracted_text);
    END
  `);

  // UPDATE trigger: Re-index on update (only for valid resources)
  await db.run(`
    CREATE TRIGGER resources_fts_update AFTER UPDATE ON resources
    WHEN NEW.invalid_at IS NULL AND OLD.invalid_at IS NULL
    BEGIN
      DELETE FROM resources_fts WHERE id = OLD.id;
      INSERT INTO resources_fts(id, name, user_notes, extracted_text)
      VALUES (NEW.id, NEW.name, NEW.user_notes, NEW.extracted_text);
    END
  `);

  // DELETE trigger: Remove from FTS on hard delete
  await db.run(`
    CREATE TRIGGER resources_fts_delete AFTER DELETE ON resources
    BEGIN
      DELETE FROM resources_fts WHERE id = OLD.id;
    END
  `);

  // Soft delete trigger: Remove from FTS when invalid_at is set
  await db.run(`
    CREATE TRIGGER resources_fts_soft_delete AFTER UPDATE ON resources
    WHEN OLD.invalid_at IS NULL AND NEW.invalid_at IS NOT NULL
    BEGIN
      DELETE FROM resources_fts WHERE id = OLD.id;
    END
  `);

  console.log('[DB] Resources FTS5 setup complete');
}

/**
 * Migrates existing resources into FTS index.
 * Call this after setupResourcesFTS() on first run or when rebuilding index.
 */
export async function migrateExistingResourcesToFTS(db: DatabaseConnection): Promise<number> {
  // Clear existing FTS data
  await db.run('DELETE FROM resources_fts');

  // Insert all valid resources
  await db.run(`
    INSERT INTO resources_fts(id, name, user_notes, extracted_text)
    SELECT id, name, user_notes, extracted_text
    FROM resources
    WHERE invalid_at IS NULL
  `);

  // Get count
  const result = await db.exec<{ count: number }>('SELECT COUNT(*) as count FROM resources_fts');
  const count = result[0]?.count ?? 0;

  if (count > 0) {
    console.log(`[DB] Migrated ${count} resources to FTS index`);
  }

  return count;
}
