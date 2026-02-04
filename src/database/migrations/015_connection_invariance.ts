// src/database/migrations/015_connection_invariance.ts — WP 9B.5: Structural Invariance

import type { DatabaseConnection } from '../init';

/**
 * Migration: Create connection_invariance table for structural invariance evidence.
 * Idempotent — safe to run multiple times.
 */
export async function setupConnectionInvariance(db: DatabaseConnection): Promise<void> {
  const existing = await db.exec<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='connection_invariance'",
  );

  if (existing.length > 0) {
    console.log('[Migration] connection_invariance table already exists');
    return;
  }

  console.log('[Migration] Creating connection_invariance table...');

  await db.run(`
    CREATE TABLE connection_invariance (
      connection_id TEXT PRIMARY KEY,
      tested_at TEXT NOT NULL,
      paraphrase_stable INTEGER,
      paraphrase_survival_rate REAL,
      paraphrase_variance REAL,
      paraphrase_variant_count INTEGER,
      paraphrase_pair_count INTEGER,
      paraphrase_min_relative REAL,
      paraphrase_max_relative REAL,
      compression_survives INTEGER,
      compression_lowest_level REAL,
      compression_interpretation TEXT,
      compression_curve TEXT,
      invariance_score REAL NOT NULL,
      robustness_label TEXT NOT NULL,
      failure_modes TEXT,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
    )
  `);

  await db.run(
    'CREATE INDEX idx_invariance_score ON connection_invariance(invariance_score)',
  );
  await db.run(
    'CREATE INDEX idx_invariance_label ON connection_invariance(robustness_label)',
  );

  console.log('[Migration] connection_invariance table created');
}
