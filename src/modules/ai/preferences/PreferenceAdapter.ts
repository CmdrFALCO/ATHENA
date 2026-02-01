/**
 * Preference Adapter - SQLite persistence for preference signals
 * WP 8.4 - Preference Learning
 */

import type { DatabaseConnection } from '@/database/init';
import type { PreferenceSignal, PreferenceStats, SignalMetadata } from './types';

export interface IPreferenceAdapter {
  /** Record a new preference signal */
  record(signal: Omit<PreferenceSignal, 'id' | 'createdAt'>): Promise<PreferenceSignal>;

  /** Get recent signals for learning */
  getRecent(limit: number): Promise<PreferenceSignal[]>;

  /** Get signals by type */
  getByType(type: 'note' | 'connection', limit?: number): Promise<PreferenceSignal[]>;

  /** Get aggregated statistics */
  getStats(): Promise<PreferenceStats>;

  /** Count signals in time window */
  countInWindow(windowMs: number): Promise<number>;

  /** Clear all signals (for reset) */
  clearAll(): Promise<void>;
}

/** Row shape returned by exec<T> for preference_signals */
interface SignalRow {
  id: string;
  proposal_type: string;
  action: string;
  confidence_at_proposal: number;
  context_hash: string | null;
  metadata: string;
  created_at: string;
}

interface CountRow {
  count: number;
}

interface TypeActionCountRow {
  proposal_type: string;
  action: string;
  count: number;
}

interface AvgConfRow {
  action: string;
  avg_conf: number;
}

interface RangeRow {
  oldest: string | null;
  newest: string | null;
}

export class SQLitePreferenceAdapter implements IPreferenceAdapter {
  constructor(private db: DatabaseConnection) {}

  async record(
    signal: Omit<PreferenceSignal, 'id' | 'createdAt'>
  ): Promise<PreferenceSignal> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO preference_signals
       (id, proposal_type, action, confidence_at_proposal, context_hash, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        signal.proposalType,
        signal.action,
        signal.confidenceAtProposal,
        signal.contextHash,
        JSON.stringify(signal.metadata),
        createdAt,
      ]
    );

    return {
      id,
      ...signal,
      createdAt,
    };
  }

  async getRecent(limit: number): Promise<PreferenceSignal[]> {
    const rows = await this.db.exec<SignalRow>(
      `SELECT * FROM preference_signals
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(this.mapRow);
  }

  async getByType(
    type: 'note' | 'connection',
    limit = 100
  ): Promise<PreferenceSignal[]> {
    const rows = await this.db.exec<SignalRow>(
      `SELECT * FROM preference_signals
       WHERE proposal_type = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [type, limit]
    );

    return rows.map(this.mapRow);
  }

  async getStats(): Promise<PreferenceStats> {
    // Total count
    const totalRows = await this.db.exec<CountRow>(
      `SELECT COUNT(*) as count FROM preference_signals`
    );
    const totalSignals = totalRows[0]?.count ?? 0;

    // By type and action
    const byTypeRows = await this.db.exec<TypeActionCountRow>(`
      SELECT proposal_type, action, COUNT(*) as count
      FROM preference_signals
      GROUP BY proposal_type, action
    `);

    const noteAccepted = this.findCount(byTypeRows, 'note', 'accept');
    const noteRejected = this.findCount(byTypeRows, 'note', 'reject');
    const connAccepted = this.findCount(byTypeRows, 'connection', 'accept');
    const connRejected = this.findCount(byTypeRows, 'connection', 'reject');

    // Confidence analysis
    const confRows = await this.db.exec<AvgConfRow>(`
      SELECT action, AVG(confidence_at_proposal) as avg_conf
      FROM preference_signals
      GROUP BY action
    `);

    const acceptedAvg = this.findAvg(confRows, 'accept');
    const rejectedAvg = this.findAvg(confRows, 'reject');

    // Time range
    const rangeRows = await this.db.exec<RangeRow>(`
      SELECT MIN(created_at) as oldest, MAX(created_at) as newest
      FROM preference_signals
    `);

    const oldest = rangeRows[0]?.oldest ?? null;
    const newest = rangeRows[0]?.newest ?? null;

    return {
      totalSignals,
      byType: {
        note: {
          accepted: noteAccepted,
          rejected: noteRejected,
          acceptRate:
            noteAccepted + noteRejected > 0
              ? noteAccepted / (noteAccepted + noteRejected)
              : 0,
        },
        connection: {
          accepted: connAccepted,
          rejected: connRejected,
          acceptRate:
            connAccepted + connRejected > 0
              ? connAccepted / (connAccepted + connRejected)
              : 0,
        },
      },
      confidenceAnalysis: {
        acceptedAvgConfidence: acceptedAvg,
        rejectedAvgConfidence: rejectedAvg,
      },
      oldestSignal: oldest,
      newestSignal: newest,
    };
  }

  async countInWindow(windowMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const rows = await this.db.exec<CountRow>(
      `SELECT COUNT(*) as count FROM preference_signals WHERE created_at > ?`,
      [cutoff]
    );
    return rows[0]?.count ?? 0;
  }

  async clearAll(): Promise<void> {
    await this.db.run(`DELETE FROM preference_signals`);
  }

  private mapRow(row: SignalRow): PreferenceSignal {
    return {
      id: row.id,
      proposalType: row.proposal_type as 'note' | 'connection',
      action: row.action as 'accept' | 'reject',
      confidenceAtProposal: row.confidence_at_proposal,
      contextHash: row.context_hash,
      metadata: JSON.parse(row.metadata || '{}') as SignalMetadata,
      createdAt: row.created_at,
    };
  }

  private findCount(
    rows: TypeActionCountRow[],
    type: string,
    action: string
  ): number {
    const row = rows.find(
      (r) => r.proposal_type === type && r.action === action
    );
    return row?.count ?? 0;
  }

  private findAvg(rows: AvgConfRow[], action: string): number {
    const row = rows.find((r) => r.action === action);
    return row?.avg_conf ?? 0;
  }
}
