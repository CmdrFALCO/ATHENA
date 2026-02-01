import type { DatabaseConnection } from '@/database/init';
import type { MergeCandidate, CandidateStatus, SimilarityScores } from '../types';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

export interface IMergeCandidateAdapter {
  create(noteAId: string, noteBId: string, scores: SimilarityScores): Promise<MergeCandidate>;
  getById(id: string): Promise<MergeCandidate | null>;
  getAll(status?: CandidateStatus): Promise<MergeCandidate[]>;
  getForNote(noteId: string): Promise<MergeCandidate[]>;
  updateStatus(id: string, status: CandidateStatus): Promise<void>;
  delete(id: string): Promise<void>;
  deleteForNote(noteId: string): Promise<void>;
  exists(noteAId: string, noteBId: string): Promise<boolean>;
}

interface CandidateRow {
  id: string;
  note_a_id: string;
  note_b_id: string;
  score_title: number;
  score_content: number;
  score_embedding: number;
  score_combined: number;
  status: string;
  detected_at: string;
  reviewed_at: string | null;
  note_a_title: string;
  note_a_content: string;
  note_a_created: string;
  note_a_updated: string;
  note_b_title: string;
  note_b_content: string;
  note_b_created: string;
  note_b_updated: string;
  note_a_connections: number;
  note_b_connections: number;
  note_a_clusters: number;
  note_b_clusters: number;
}

const CANDIDATE_JOIN_QUERY = `
  SELECT mc.*,
         na.title as note_a_title, na.content as note_a_content,
         na.created_at as note_a_created, na.updated_at as note_a_updated,
         nb.title as note_b_title, nb.content as note_b_content,
         nb.created_at as note_b_created, nb.updated_at as note_b_updated,
         (SELECT COUNT(*) FROM connections
          WHERE (source_id = mc.note_a_id OR target_id = mc.note_a_id)
            AND invalid_at IS NULL) as note_a_connections,
         (SELECT COUNT(*) FROM connections
          WHERE (source_id = mc.note_b_id OR target_id = mc.note_b_id)
            AND invalid_at IS NULL) as note_b_connections,
         (SELECT COUNT(*) FROM cluster_members
          WHERE entity_id = mc.note_a_id) as note_a_clusters,
         (SELECT COUNT(*) FROM cluster_members
          WHERE entity_id = mc.note_b_id) as note_b_clusters
  FROM merge_candidates mc
  JOIN entities na ON na.id = mc.note_a_id AND na.invalid_at IS NULL
  JOIN entities nb ON nb.id = mc.note_b_id AND nb.invalid_at IS NULL
`;

export class SQLiteMergeCandidateAdapter implements IMergeCandidateAdapter {
  constructor(private db: DatabaseConnection) {}

  async create(
    noteAId: string,
    noteBId: string,
    scores: SimilarityScores
  ): Promise<MergeCandidate> {
    // Consistent ordering to prevent (A,B) and (B,A) duplicates
    const [firstId, secondId] = noteAId < noteBId ? [noteAId, noteBId] : [noteBId, noteAId];

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO merge_candidates
       (id, note_a_id, note_b_id, score_title, score_content, score_embedding, score_combined, status, detected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, firstId, secondId, scores.title, scores.content, scores.embedding, scores.combined, now]
    );

    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<MergeCandidate | null> {
    const rows = await this.db.exec<CandidateRow>(
      `${CANDIDATE_JOIN_QUERY} WHERE mc.id = ?`,
      [id]
    );

    return rows[0] ? this.rowToCandidate(rows[0]) : null;
  }

  async getAll(status?: CandidateStatus): Promise<MergeCandidate[]> {
    let query = CANDIDATE_JOIN_QUERY;
    const params: unknown[] = [];

    if (status) {
      query += ' WHERE mc.status = ?';
      params.push(status);
    }

    query += ' ORDER BY mc.score_combined DESC';

    const rows = await this.db.exec<CandidateRow>(query, params);
    return rows.map((row) => this.rowToCandidate(row));
  }

  async getForNote(noteId: string): Promise<MergeCandidate[]> {
    const rows = await this.db.exec<CandidateRow>(
      `${CANDIDATE_JOIN_QUERY} WHERE mc.note_a_id = ? OR mc.note_b_id = ?
       ORDER BY mc.score_combined DESC`,
      [noteId, noteId]
    );

    return rows.map((row) => this.rowToCandidate(row));
  }

  async updateStatus(id: string, status: CandidateStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run('UPDATE merge_candidates SET status = ?, reviewed_at = ? WHERE id = ?', [
      status,
      now,
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM merge_candidates WHERE id = ?', [id]);
  }

  async deleteForNote(noteId: string): Promise<void> {
    await this.db.run('DELETE FROM merge_candidates WHERE note_a_id = ? OR note_b_id = ?', [
      noteId,
      noteId,
    ]);
  }

  async exists(noteAId: string, noteBId: string): Promise<boolean> {
    const [firstId, secondId] = noteAId < noteBId ? [noteAId, noteBId] : [noteBId, noteAId];

    const rows = await this.db.exec<{ id: string }>(
      'SELECT id FROM merge_candidates WHERE note_a_id = ? AND note_b_id = ?',
      [firstId, secondId]
    );

    return rows.length > 0;
  }

  private rowToCandidate(row: CandidateRow): MergeCandidate {
    return {
      id: row.id,
      noteA: {
        id: row.note_a_id,
        title: row.note_a_title,
        contentPreview: extractTextFromTiptap(row.note_a_content).slice(0, 200),
        createdAt: row.note_a_created,
        updatedAt: row.note_a_updated,
        connectionCount: row.note_a_connections,
        clusterCount: row.note_a_clusters,
      },
      noteB: {
        id: row.note_b_id,
        title: row.note_b_title,
        contentPreview: extractTextFromTiptap(row.note_b_content).slice(0, 200),
        createdAt: row.note_b_created,
        updatedAt: row.note_b_updated,
        connectionCount: row.note_b_connections,
        clusterCount: row.note_b_clusters,
      },
      scores: {
        title: row.score_title,
        content: row.score_content,
        embedding: row.score_embedding,
        combined: row.score_combined,
      },
      status: row.status as CandidateStatus,
      detectedAt: row.detected_at,
      reviewedAt: row.reviewed_at ?? undefined,
    };
  }
}
