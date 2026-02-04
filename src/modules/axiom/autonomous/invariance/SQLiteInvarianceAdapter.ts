/**
 * WP 9B.5: SQLite Invariance Adapter
 *
 * Persists structural invariance evidence (paraphrase + compression test results)
 * for connections. Follows the existing adapter pattern with lazy initialization.
 */

import type { DatabaseConnection } from '@/database/init';
import type {
  IInvarianceAdapter,
  InvarianceEvidence,
  RobustnessLabel,
  ParaphraseResult,
  CompressionResult,
  CompressionBreakdownPoint,
} from './types';

interface InvarianceRow {
  connection_id: string;
  tested_at: string;
  paraphrase_stable: number | null;
  paraphrase_survival_rate: number | null;
  paraphrase_variance: number | null;
  paraphrase_variant_count: number | null;
  paraphrase_pair_count: number | null;
  paraphrase_min_relative: number | null;
  paraphrase_max_relative: number | null;
  compression_survives: number | null;
  compression_lowest_level: number | null;
  compression_interpretation: string | null;
  compression_curve: string | null;
  invariance_score: number;
  robustness_label: string;
  failure_modes: string | null;
}

export class SQLiteInvarianceAdapter implements IInvarianceAdapter {
  constructor(private db: DatabaseConnection) {}

  async save(evidence: InvarianceEvidence): Promise<void> {
    // Upsert: INSERT OR REPLACE since connection_id is PRIMARY KEY
    await this.db.run(
      `INSERT OR REPLACE INTO connection_invariance (
        connection_id, tested_at,
        paraphrase_stable, paraphrase_survival_rate, paraphrase_variance,
        paraphrase_variant_count, paraphrase_pair_count,
        paraphrase_min_relative, paraphrase_max_relative,
        compression_survives, compression_lowest_level,
        compression_interpretation, compression_curve,
        invariance_score, robustness_label, failure_modes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evidence.connectionId,
        evidence.testedAt,
        evidence.paraphrase ? (evidence.paraphrase.stable ? 1 : 0) : null,
        evidence.paraphrase?.survivalRate ?? null,
        evidence.paraphrase?.variance ?? null,
        evidence.paraphrase?.variantCount ?? null,
        evidence.paraphrase?.pairCount ?? null,
        evidence.paraphrase?.minRelativeScore ?? null,
        evidence.paraphrase?.maxRelativeScore ?? null,
        evidence.compression ? (evidence.compression.survives ? 1 : 0) : null,
        evidence.compression?.lowestSurvivingLevel ?? null,
        evidence.compression?.interpretation ?? null,
        evidence.compression
          ? JSON.stringify(evidence.compression.breakdownCurve)
          : null,
        evidence.invarianceScore,
        evidence.robustnessLabel,
        JSON.stringify(evidence.failureModes),
      ],
    );
  }

  async get(connectionId: string): Promise<InvarianceEvidence | null> {
    const rows = await this.db.exec<InvarianceRow>(
      'SELECT * FROM connection_invariance WHERE connection_id = ?',
      [connectionId],
    );

    if (rows.length === 0) return null;
    return this.fromRow(rows[0]);
  }

  async getByLabel(label: RobustnessLabel): Promise<InvarianceEvidence[]> {
    const rows = await this.db.exec<InvarianceRow>(
      'SELECT * FROM connection_invariance WHERE robustness_label = ? ORDER BY invariance_score ASC',
      [label],
    );

    return rows.map((row) => this.fromRow(row));
  }

  async getByScoreRange(
    min: number,
    max: number,
  ): Promise<InvarianceEvidence[]> {
    const rows = await this.db.exec<InvarianceRow>(
      'SELECT * FROM connection_invariance WHERE invariance_score >= ? AND invariance_score <= ? ORDER BY invariance_score ASC',
      [min, max],
    );

    return rows.map((row) => this.fromRow(row));
  }

  async delete(connectionId: string): Promise<void> {
    await this.db.run(
      'DELETE FROM connection_invariance WHERE connection_id = ?',
      [connectionId],
    );
  }

  async deleteAll(): Promise<void> {
    await this.db.run('DELETE FROM connection_invariance');
  }

  // --- Private helpers ---

  private fromRow(row: InvarianceRow): InvarianceEvidence {
    return {
      connectionId: row.connection_id,
      testedAt: row.tested_at,
      paraphrase: this.parseParaphrase(row),
      compression: this.parseCompression(row),
      invarianceScore: row.invariance_score,
      robustnessLabel: row.robustness_label as RobustnessLabel,
      failureModes: row.failure_modes
        ? (JSON.parse(row.failure_modes) as string[])
        : [],
    };
  }

  private parseParaphrase(row: InvarianceRow): ParaphraseResult | null {
    if (row.paraphrase_stable === null) return null;

    return {
      tested: true,
      stable: row.paraphrase_stable === 1,
      survivalRate: row.paraphrase_survival_rate ?? 0,
      minRelativeScore: row.paraphrase_min_relative ?? 0,
      maxRelativeScore: row.paraphrase_max_relative ?? 0,
      variance: row.paraphrase_variance ?? 0,
      variantCount: row.paraphrase_variant_count ?? 0,
      pairCount: row.paraphrase_pair_count ?? 0,
    };
  }

  private parseCompression(row: InvarianceRow): CompressionResult | null {
    if (row.compression_survives === null) return null;

    let breakdownCurve: CompressionBreakdownPoint[] = [];
    if (row.compression_curve) {
      try {
        breakdownCurve = JSON.parse(
          row.compression_curve,
        ) as CompressionBreakdownPoint[];
      } catch {
        breakdownCurve = [];
      }
    }

    return {
      tested: true,
      survives: row.compression_survives === 1,
      lowestSurvivingLevel: row.compression_lowest_level ?? 1.0,
      interpretation:
        (row.compression_interpretation as CompressionResult['interpretation']) ??
        'surface_pattern',
      breakdownCurve,
    };
  }
}
