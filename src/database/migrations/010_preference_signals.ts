import type { DatabaseConnection } from '../init';

/**
 * Migration 010: Create preference_signals table (WP 8.4)
 *
 * Records user accept/reject decisions on AI proposals for preference learning.
 * Enables confidence adjustment based on historical patterns.
 */
export async function setupPreferenceSignals(db: DatabaseConnection): Promise<void> {
  // Create preference_signals table
  await db.run(`
    CREATE TABLE IF NOT EXISTS preference_signals (
      id TEXT PRIMARY KEY,
      proposal_type TEXT NOT NULL CHECK(proposal_type IN ('note', 'connection')),
      action TEXT NOT NULL CHECK(action IN ('accept', 'reject')),
      confidence_at_proposal REAL NOT NULL,
      context_hash TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Indexes for efficient querying
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_signals_type_action
    ON preference_signals(proposal_type, action)
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_signals_created
    ON preference_signals(created_at DESC)
  `);

  console.log('[Migration] preference_signals table ready');
}
