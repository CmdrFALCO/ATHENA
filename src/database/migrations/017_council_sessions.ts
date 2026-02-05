/**
 * Migration 017: Council Sessions
 * WP 9B.8 — Multi-Agent Council persistence
 *
 * Stores council session transcripts for replay and auditing.
 */

import type { DatabaseConnection } from '../init';

export async function setupCouncilSessions(db: DatabaseConnection): Promise<void> {
  const existing = await db.exec<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='council_sessions'",
  );

  if (existing.length > 0) {
    console.log('[Migration] council_sessions table already exists');
    return;
  }

  console.log('[Migration] Creating council_sessions table...');

  await db.run(`
    CREATE TABLE IF NOT EXISTS council_sessions (
      id TEXT PRIMARY KEY,
      correlation_id TEXT NOT NULL UNIQUE,
      query TEXT NOT NULL,
      context_node_ids TEXT,
      generator_response TEXT,
      critic_response TEXT,
      synthesizer_response TEXT,
      proposals_count INTEGER DEFAULT 0,
      dropped_count INTEGER DEFAULT 0,
      total_duration_ms INTEGER,
      agent_timings TEXT,
      council_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_council_sessions_created ON council_sessions(created_at DESC)',
  );

  console.log('[Migration] council_sessions table created');
}
