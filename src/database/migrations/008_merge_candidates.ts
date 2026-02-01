import type { DatabaseConnection } from '../init';

/**
 * Migration 008: Create merge candidates tables for entity resolution (WP 8.1)
 *
 * Stores detected near-duplicate note pairs with similarity scores
 * for human review and optional merging.
 */
export async function setupMergeCandidates(db: DatabaseConnection): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS merge_candidates (
      id TEXT PRIMARY KEY,
      note_a_id TEXT NOT NULL,
      note_b_id TEXT NOT NULL,
      score_title REAL NOT NULL,
      score_content REAL NOT NULL,
      score_embedding REAL NOT NULL,
      score_combined REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
      detected_at TEXT NOT NULL,
      reviewed_at TEXT,

      UNIQUE(note_a_id, note_b_id),
      FOREIGN KEY (note_a_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (note_b_id) REFERENCES entities(id) ON DELETE CASCADE
    )
  `);

  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_candidates_status ON merge_candidates(status)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_candidates_score ON merge_candidates(score_combined DESC)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_candidates_note_a ON merge_candidates(note_a_id)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_candidates_note_b ON merge_candidates(note_b_id)`
  );

  await db.run(`
    CREATE TABLE IF NOT EXISTS similarity_scans (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      notes_scanned INTEGER NOT NULL DEFAULT 0,
      candidates_found INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'complete', 'error')),
      error TEXT
    )
  `);
}
