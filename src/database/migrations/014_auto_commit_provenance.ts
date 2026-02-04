// src/database/migrations/014_auto_commit_provenance.ts — WP 9B.2: Autonomous Mode

import type { DatabaseConnection } from '../init';

/**
 * Migration: Create auto_commit_provenance table for autonomous mode audit trail.
 * Idempotent — safe to run multiple times.
 */
export async function setupAutoCommitProvenance(db: DatabaseConnection): Promise<void> {
  const existing = await db.exec<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='auto_commit_provenance'",
  );

  if (existing.length > 0) {
    console.log('[Migration] auto_commit_provenance table already exists');
    return;
  }

  console.log('[Migration] Creating auto_commit_provenance table...');

  await db.run(`
    CREATE TABLE auto_commit_provenance (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      source TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      confidence REAL NOT NULL,
      confidence_factors TEXT NOT NULL,
      validations_passed TEXT NOT NULL,
      critique_survival REAL,
      created_at TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      review_status TEXT DEFAULT 'auto_approved',
      reviewed_at TEXT,
      review_note TEXT,
      can_revert INTEGER DEFAULT 1,
      revert_snapshot TEXT
    )
  `);

  await db.run('CREATE INDEX idx_provenance_status ON auto_commit_provenance(review_status)');
  await db.run('CREATE INDEX idx_provenance_date ON auto_commit_provenance(created_at)');
  await db.run('CREATE INDEX idx_provenance_confidence ON auto_commit_provenance(confidence)');
  await db.run('CREATE INDEX idx_provenance_correlation ON auto_commit_provenance(correlation_id)');

  console.log('[Migration] auto_commit_provenance table created');
}
