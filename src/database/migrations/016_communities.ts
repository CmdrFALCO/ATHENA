// src/database/migrations/016_communities.ts — WP 9B.7: Community Detection

import type { DatabaseConnection } from '../init';

/**
 * Migration: Create communities and community_members tables for
 * hierarchical Louvain community detection.
 * Idempotent — safe to run multiple times.
 */
export async function setupCommunities(db: DatabaseConnection): Promise<void> {
  const existing = await db.exec<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='communities'",
  );

  if (existing.length > 0) {
    console.log('[Migration] communities table already exists');
    return;
  }

  console.log('[Migration] Creating communities tables...');

  await db.run(`
    CREATE TABLE communities (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 0,
      parent_community_id TEXT,
      summary TEXT,
      keywords TEXT,
      embedding BLOB,
      algorithm TEXT NOT NULL,
      modularity REAL,
      color TEXT NOT NULL,
      stale INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_refreshed_at TEXT NOT NULL,
      FOREIGN KEY (parent_community_id) REFERENCES communities(id) ON DELETE SET NULL
    )
  `);

  await db.run(`
    CREATE TABLE community_members (
      community_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      PRIMARY KEY (community_id, entity_id),
      FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    )
  `);

  await db.run('CREATE INDEX idx_community_level ON communities(level)');
  await db.run('CREATE INDEX idx_community_stale ON communities(stale)');
  await db.run('CREATE INDEX idx_community_parent ON communities(parent_community_id)');
  await db.run('CREATE INDEX idx_community_member_entity ON community_members(entity_id)');

  console.log('[Migration] communities tables created');
}
