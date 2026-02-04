/**
 * Provenance Adapter — WP 9B.2
 *
 * SQLite persistence for auto-commit audit trail.
 * Every autonomous commit creates an AutoCommitProvenance record
 * with full revert capability.
 */

import type { DatabaseConnection } from '@/database/init';
import type {
  AutoCommitProvenance,
  IProvenanceAdapter,
  ReviewStatus,
  RevertSnapshot,
} from './types';

export class ProvenanceAdapter implements IProvenanceAdapter {
  private initialized = false;

  constructor(private db: DatabaseConnection) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const existing = await this.db.exec<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='auto_commit_provenance'",
    );

    if (existing.length === 0) {
      console.log('[AXIOM/Provenance] Creating auto_commit_provenance table...');

      await this.db.run(`
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

      await this.db.run(
        'CREATE INDEX idx_provenance_status ON auto_commit_provenance(review_status)',
      );
      await this.db.run(
        'CREATE INDEX idx_provenance_date ON auto_commit_provenance(created_at)',
      );
      await this.db.run(
        'CREATE INDEX idx_provenance_confidence ON auto_commit_provenance(confidence)',
      );
      await this.db.run(
        'CREATE INDEX idx_provenance_correlation ON auto_commit_provenance(correlation_id)',
      );

      console.log('[AXIOM/Provenance] Table created');
    }

    this.initialized = true;
  }

  async record(provenance: AutoCommitProvenance): Promise<void> {
    await this.ensureInitialized();

    await this.db.run(
      `INSERT INTO auto_commit_provenance
        (id, target_type, target_id, source, correlation_id, confidence,
         confidence_factors, validations_passed, critique_survival,
         created_at, config_snapshot, review_status, reviewed_at,
         review_note, can_revert, revert_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provenance.id,
        provenance.target_type,
        provenance.target_id,
        provenance.source,
        provenance.correlation_id,
        provenance.confidence,
        JSON.stringify(provenance.confidence_factors),
        JSON.stringify(provenance.validations_passed),
        provenance.critique_survival ?? null,
        provenance.created_at,
        JSON.stringify(provenance.config_snapshot),
        provenance.review_status,
        provenance.reviewed_at ?? null,
        provenance.review_note ?? null,
        provenance.can_revert ? 1 : 0,
        provenance.revert_snapshot ? JSON.stringify(provenance.revert_snapshot) : null,
      ],
    );
  }

  async getByStatus(status: ReviewStatus, limit = 100): Promise<AutoCommitProvenance[]> {
    await this.ensureInitialized();

    const rows = await this.db.exec<ProvenanceRow>(
      'SELECT * FROM auto_commit_provenance WHERE review_status = ? ORDER BY created_at DESC LIMIT ?',
      [status, limit],
    );

    return rows.map(this.fromRow);
  }

  async getByCorrelation(correlationId: string): Promise<AutoCommitProvenance[]> {
    await this.ensureInitialized();

    const rows = await this.db.exec<ProvenanceRow>(
      'SELECT * FROM auto_commit_provenance WHERE correlation_id = ? ORDER BY created_at DESC',
      [correlationId],
    );

    return rows.map(this.fromRow);
  }

  async getRecent(limit: number): Promise<AutoCommitProvenance[]> {
    await this.ensureInitialized();

    const rows = await this.db.exec<ProvenanceRow>(
      'SELECT * FROM auto_commit_provenance ORDER BY created_at DESC LIMIT ?',
      [limit],
    );

    return rows.map(this.fromRow);
  }

  async updateReviewStatus(
    id: string,
    status: ReviewStatus,
    note?: string,
  ): Promise<void> {
    await this.ensureInitialized();

    await this.db.run(
      `UPDATE auto_commit_provenance
       SET review_status = ?, reviewed_at = ?, review_note = ?
       WHERE id = ?`,
      [status, new Date().toISOString(), note ?? null, id],
    );
  }

  async getStats(
    hours = 24,
  ): Promise<{ total: number; byStatus: Record<ReviewStatus, number> }> {
    await this.ensureInitialized();

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const totalRows = await this.db.exec<{ count: number }>(
      'SELECT COUNT(*) as count FROM auto_commit_provenance WHERE created_at > ?',
      [cutoff],
    );

    const statusRows = await this.db.exec<{ review_status: ReviewStatus; count: number }>(
      `SELECT review_status, COUNT(*) as count
       FROM auto_commit_provenance WHERE created_at > ?
       GROUP BY review_status`,
      [cutoff],
    );

    const byStatus: Record<ReviewStatus, number> = {
      auto_approved: 0,
      pending_review: 0,
      human_confirmed: 0,
      human_reverted: 0,
      auto_rejected: 0,
    };

    for (const row of statusRows) {
      byStatus[row.review_status] = row.count;
    }

    return {
      total: totalRows[0]?.count ?? 0,
      byStatus,
    };
  }

  async getRevertSnapshot(id: string): Promise<RevertSnapshot | null> {
    await this.ensureInitialized();

    const rows = await this.db.exec<{ revert_snapshot: string | null }>(
      'SELECT revert_snapshot FROM auto_commit_provenance WHERE id = ?',
      [id],
    );

    if (rows.length === 0 || !rows[0].revert_snapshot) return null;

    return JSON.parse(rows[0].revert_snapshot) as RevertSnapshot;
  }

  // --- Helpers ---

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private fromRow(row: ProvenanceRow): AutoCommitProvenance {
    return {
      id: row.id,
      target_type: row.target_type as 'entity' | 'connection',
      target_id: row.target_id,
      source: row.source as AutoCommitProvenance['source'],
      correlation_id: row.correlation_id,
      confidence: row.confidence,
      confidence_factors: JSON.parse(row.confidence_factors),
      validations_passed: JSON.parse(row.validations_passed),
      critique_survival: row.critique_survival ?? undefined,
      created_at: row.created_at,
      config_snapshot: JSON.parse(row.config_snapshot),
      review_status: row.review_status as ReviewStatus,
      reviewed_at: row.reviewed_at ?? undefined,
      review_note: row.review_note ?? undefined,
      can_revert: row.can_revert === 1,
      revert_snapshot: row.revert_snapshot
        ? JSON.parse(row.revert_snapshot)
        : undefined,
    };
  }
}

interface ProvenanceRow {
  id: string;
  target_type: string;
  target_id: string;
  source: string;
  correlation_id: string;
  confidence: number;
  confidence_factors: string;
  validations_passed: string;
  critique_survival: number | null;
  created_at: string;
  config_snapshot: string;
  review_status: string;
  reviewed_at: string | null;
  review_note: string | null;
  can_revert: number;
  revert_snapshot: string | null;
}
