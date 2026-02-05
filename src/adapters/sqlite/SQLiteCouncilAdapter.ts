/**
 * SQLiteCouncilAdapter — Persistence for council sessions
 * WP 9B.8
 *
 * Follows the pattern from SQLiteCommunityAdapter:
 * DatabaseConnection injection, JSON serialization for complex fields.
 */

import type { DatabaseConnection } from '@/database/init';
import type { CouncilSession, AgentRole } from '@/modules/axiom/council/types';

export interface ICouncilAdapter {
  save(session: CouncilSession): Promise<void>;
  getRecent(limit: number): Promise<CouncilSession[]>;
  getById(id: string): Promise<CouncilSession | null>;
  delete(id: string): Promise<void>;
}

interface CouncilSessionRow {
  id: string;
  correlation_id: string;
  query: string;
  context_node_ids: string | null;
  generator_response: string | null;
  critic_response: string | null;
  synthesizer_response: string | null;
  proposals_count: number;
  dropped_count: number;
  total_duration_ms: number | null;
  agent_timings: string | null;
  council_notes: string | null;
  created_at: string;
}

export class SQLiteCouncilAdapter implements ICouncilAdapter {
  constructor(private db: DatabaseConnection) {}

  async save(session: CouncilSession): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO council_sessions
       (id, correlation_id, query, context_node_ids,
        generator_response, critic_response, synthesizer_response,
        proposals_count, dropped_count, total_duration_ms,
        agent_timings, council_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.correlationId,
        session.query,
        JSON.stringify(session.contextNodeIds),
        session.generatorResponse,
        session.criticResponse,
        session.synthesizerResponse,
        session.proposalsCount,
        session.droppedCount,
        session.totalDurationMs,
        JSON.stringify(session.agentTimings),
        JSON.stringify(session.councilNotes),
        session.createdAt,
      ],
    );
  }

  async getRecent(limit: number): Promise<CouncilSession[]> {
    const rows = await this.db.exec<CouncilSessionRow>(
      'SELECT * FROM council_sessions ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((row) => this.fromRow(row));
  }

  async getById(id: string): Promise<CouncilSession | null> {
    const rows = await this.db.exec<CouncilSessionRow>(
      'SELECT * FROM council_sessions WHERE id = ?',
      [id],
    );
    return rows.length > 0 ? this.fromRow(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM council_sessions WHERE id = ?', [id]);
  }

  private fromRow(row: CouncilSessionRow): CouncilSession {
    return {
      id: row.id,
      correlationId: row.correlation_id,
      query: row.query,
      contextNodeIds: row.context_node_ids ? JSON.parse(row.context_node_ids) : [],
      generatorResponse: row.generator_response ?? '',
      criticResponse: row.critic_response ?? '',
      synthesizerResponse: row.synthesizer_response ?? '',
      proposalsCount: row.proposals_count,
      droppedCount: row.dropped_count,
      totalDurationMs: row.total_duration_ms ?? 0,
      agentTimings: row.agent_timings
        ? JSON.parse(row.agent_timings)
        : ({ generator: 0, critic: 0, synthesizer: 0 } as Record<AgentRole, number>),
      councilNotes: row.council_notes ? JSON.parse(row.council_notes) : [],
      createdAt: row.created_at,
    };
  }
}
