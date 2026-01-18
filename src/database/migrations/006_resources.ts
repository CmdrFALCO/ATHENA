import type { DatabaseConnection } from '../init';

/**
 * Migration 006: Create resources table
 *
 * Resources are first-class graph nodes that can be connected to entities
 * and other resources. They support various file types and URL references.
 */
export async function setupResources(db: DatabaseConnection): Promise<void> {
  // Create resources table
  await db.run(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'xlsx', 'md', 'image', 'url')),
      name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,

      storage_type TEXT NOT NULL CHECK (storage_type IN ('inline', 'blob', 'url')),
      storage_key TEXT,

      user_notes TEXT,
      extracted_text TEXT,
      extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'complete', 'failed', 'skipped')),
      extraction_method TEXT CHECK (extraction_method IS NULL OR extraction_method IN ('browser', 'ai', 'server')),

      url TEXT,
      url_mode TEXT CHECK (url_mode IS NULL OR url_mode IN ('reference', 'extracted')),

      position_x REAL,
      position_y REAL,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      valid_at TEXT NOT NULL,
      invalid_at TEXT
    )
  `);

  // Create indexes for common queries
  await db.run(`CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_resources_extraction_status ON resources(extraction_status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_resources_valid ON resources(valid_at, invalid_at)`);
}
