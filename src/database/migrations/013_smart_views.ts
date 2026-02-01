// src/database/migrations/013_smart_views.ts — WP 8.9: Smart Views

import type { DatabaseConnection } from '../init';

/**
 * Migration: Create smart_views table for custom user views.
 * Idempotent — safe to run multiple times.
 */
export async function setupSmartViews(db: DatabaseConnection): Promise<void> {
  // Check if table exists
  const existing = await db.exec<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='smart_views'",
  );

  if (existing.length > 0) {
    console.log('[Migration] smart_views table already exists');
    return;
  }

  console.log('[Migration] Creating smart_views table...');

  await db.run(`
    CREATE TABLE smart_views (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sql TEXT NOT NULL,
      parameters TEXT,
      category TEXT DEFAULT 'user',
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run('CREATE INDEX idx_smart_views_category ON smart_views(category)');
  await db.run('CREATE INDEX idx_smart_views_name ON smart_views(name)');

  console.log('[Migration] smart_views table created');
}
