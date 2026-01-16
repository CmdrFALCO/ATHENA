import type { DatabaseConnection } from '../init';

/**
 * Sets up FTS5 full-text search for entities.
 *
 * Using custom sql.js build with FTS5 enabled for advanced features:
 * - bm25() ranking for relevance scoring
 * - highlight() for marking matches in results
 * - snippet() for extracting context around matches
 * - unicode61 tokenizer for better international text support
 *
 * Triggers keep FTS in sync with the source table, handling:
 * - INSERT: Add new valid entities to FTS
 * - UPDATE: Re-index on content/title changes
 * - DELETE: Remove from FTS
 * - Soft delete: Remove when invalid_at is set
 */
export async function setupFTS5(db: DatabaseConnection): Promise<void> {
  // Step 1: Add content_text column if not exists
  // SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we check first
  const columns = await db.exec<{ name: string }>(
    "SELECT name FROM pragma_table_info('entities')"
  );
  const hasContentText = columns.some((col) => col.name === 'content_text');

  if (!hasContentText) {
    await db.run('ALTER TABLE entities ADD COLUMN content_text TEXT');
  }

  // Step 2: Create FTS5 virtual table
  // Using custom sql.js build with FTS5 enabled
  // - id is UNINDEXED (stored but not searchable, used for joins)
  // - porter unicode61 tokenizer for stemming + unicode support
  await db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
      id UNINDEXED,
      title,
      content_text,
      tokenize='porter unicode61'
    )
  `);

  // Step 3: Create sync triggers
  // Drop existing triggers first (ignore errors if they don't exist)
  const triggerNames = [
    'entities_fts_insert',
    'entities_fts_update',
    'entities_fts_delete',
    'entities_fts_soft_delete',
  ];

  for (const trigger of triggerNames) {
    try {
      await db.run(`DROP TRIGGER IF EXISTS ${trigger}`);
    } catch {
      // Ignore - trigger may not exist
    }
  }

  // INSERT trigger: Add to FTS when a valid entity is inserted
  await db.run(`
    CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities
    WHEN NEW.invalid_at IS NULL
    BEGIN
      INSERT INTO entities_fts(id, title, content_text)
      VALUES (NEW.id, NEW.title, NEW.content_text);
    END
  `);

  // UPDATE trigger: Re-index on update (only for valid entities)
  await db.run(`
    CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities
    WHEN NEW.invalid_at IS NULL AND OLD.invalid_at IS NULL
    BEGIN
      DELETE FROM entities_fts WHERE id = OLD.id;
      INSERT INTO entities_fts(id, title, content_text)
      VALUES (NEW.id, NEW.title, NEW.content_text);
    END
  `);

  // DELETE trigger: Remove from FTS on hard delete
  await db.run(`
    CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities
    BEGIN
      DELETE FROM entities_fts WHERE id = OLD.id;
    END
  `);

  // Soft delete trigger: Remove from FTS when invalid_at is set
  await db.run(`
    CREATE TRIGGER entities_fts_soft_delete AFTER UPDATE ON entities
    WHEN OLD.invalid_at IS NULL AND NEW.invalid_at IS NOT NULL
    BEGIN
      DELETE FROM entities_fts WHERE id = OLD.id;
    END
  `);
}

/**
 * Migrates existing entities to FTS index.
 * Call this after setupFTS5() on first run or when rebuilding index.
 */
export async function migrateExistingToFTS(db: DatabaseConnection): Promise<number> {
  // Clear existing FTS data
  await db.run('DELETE FROM entities_fts');

  // Get count of valid entities with content_text
  const countResult = await db.exec<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM entities
    WHERE invalid_at IS NULL
      AND content_text IS NOT NULL
  `);
  const count = countResult[0]?.count ?? 0;

  if (count > 0) {
    // Insert all valid entities
    await db.run(`
      INSERT INTO entities_fts(id, title, content_text)
      SELECT id, title, content_text
      FROM entities
      WHERE invalid_at IS NULL
        AND content_text IS NOT NULL
    `);
  }

  return count;
}

/**
 * Updates content_text for all entities that have content but no content_text.
 * This is a one-time migration for existing data.
 *
 * Note: The extractText function is passed in since the DB layer
 * shouldn't depend on application utilities.
 */
export async function populateContentText(
  db: DatabaseConnection,
  extractText: (content: unknown) => string
): Promise<number> {
  // Get all entities with content but no content_text
  const entities = await db.exec<{ id: string; content: string }>(`
    SELECT id, content FROM entities
    WHERE content IS NOT NULL
      AND (content_text IS NULL OR content_text = '')
      AND invalid_at IS NULL
  `);

  if (entities.length === 0) return 0;

  let updated = 0;

  for (const entity of entities) {
    try {
      const plainText = extractText(entity.content);
      await db.run('UPDATE entities SET content_text = ? WHERE id = ?', [
        plainText,
        entity.id,
      ]);
      updated++;
    } catch (e) {
      console.warn(`Failed to extract text for entity ${entity.id}:`, e);
    }
  }

  return updated;
}
