import type {
  Cluster,
  ClusterMember,
  ClusterType,
  ClusterColor,
  MemberRole,
  CreateClusterInput,
} from '@/shared/types';
import type { IClusterAdapter } from '../IClusterAdapter';
import type { DatabaseConnection } from '@/database';

export class SQLiteClusterAdapter implements IClusterAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getById(id: string): Promise<Cluster | undefined> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM clusters WHERE id = ? AND invalid_at IS NULL`,
      [id]
    );

    if (!results[0]) {
      return undefined;
    }

    const cluster = this.mapToCluster(results[0]);
    cluster.members = await this.getMembers(id);
    return cluster;
  }

  async getAll(): Promise<Cluster[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM clusters WHERE invalid_at IS NULL ORDER BY created_at DESC`
    );
    return results.map((row) => this.mapToCluster(row));
  }

  async create(input: CreateClusterInput): Promise<Cluster> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO clusters (id, label, description, type, color, created_by, confidence, created_at, valid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.label,
        input.description ?? null,
        input.type,
        input.color,
        input.created_by,
        input.confidence ?? null,
        now,
        now,
      ]
    );

    // Add members
    for (const member of input.members) {
      await this.addMember(id, member.entity_id, member.role, member.position);
    }

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to create cluster');
    }
    return result;
  }

  async update(
    id: string,
    updates: Partial<Pick<Cluster, 'label' | 'description' | 'confidence'>>
  ): Promise<Cluster> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.label !== undefined) {
      setClauses.push('label = ?');
      values.push(updates.label);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }
    if (updates.confidence !== undefined) {
      setClauses.push('confidence = ?');
      values.push(updates.confidence);
    }

    if (setClauses.length === 0) {
      const result = await this.getById(id);
      if (!result) {
        throw new Error('Cluster not found');
      }
      return result;
    }

    values.push(id);

    await this.db.run(
      `UPDATE clusters SET ${setClauses.join(', ')} WHERE id = ? AND invalid_at IS NULL`,
      values
    );

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to update cluster');
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.invalidate(id);
  }

  async addMember(
    clusterId: string,
    entityId: string,
    role: MemberRole,
    position?: number
  ): Promise<ClusterMember> {
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO cluster_members (cluster_id, entity_id, role, position, added_at)
       VALUES (?, ?, ?, ?, ?)`,
      [clusterId, entityId, role, position ?? null, now]
    );

    return {
      entity_id: entityId,
      role,
      position,
      added_at: now,
    };
  }

  async removeMember(clusterId: string, entityId: string): Promise<void> {
    await this.db.run(
      `DELETE FROM cluster_members WHERE cluster_id = ? AND entity_id = ?`,
      [clusterId, entityId]
    );
  }

  async getMembers(clusterId: string): Promise<ClusterMember[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM cluster_members WHERE cluster_id = ? ORDER BY position ASC, added_at ASC`,
      [clusterId]
    );
    return results.map((row) => this.mapToMember(row));
  }

  async getClustersForEntity(entityId: string): Promise<Cluster[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT c.* FROM clusters c
       INNER JOIN cluster_members cm ON c.id = cm.cluster_id
       WHERE cm.entity_id = ? AND c.invalid_at IS NULL
       ORDER BY c.created_at DESC`,
      [entityId]
    );
    return results.map((row) => this.mapToCluster(row));
  }

  async getByType(type: ClusterType): Promise<Cluster[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM clusters WHERE type = ? AND invalid_at IS NULL ORDER BY created_at DESC`,
      [type]
    );
    return results.map((row) => this.mapToCluster(row));
  }

  async getByColor(color: ClusterColor): Promise<Cluster[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM clusters WHERE color = ? AND invalid_at IS NULL ORDER BY created_at DESC`,
      [color]
    );
    return results.map((row) => this.mapToCluster(row));
  }

  async getViolations(): Promise<Cluster[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM clusters WHERE (color = 'red' OR color = 'amber') AND invalid_at IS NULL ORDER BY created_at DESC`
    );
    return results.map((row) => this.mapToCluster(row));
  }

  // reason parameter reserved for future audit logging
  async invalidate(id: string, reason?: string): Promise<void> {
    void reason;
    await this.db.run(`UPDATE clusters SET invalid_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  }

  private mapToCluster(row: Record<string, unknown>): Cluster {
    return {
      id: row.id as string,
      label: row.label as string,
      description: row.description as string | undefined,
      type: row.type as ClusterType,
      color: row.color as ClusterColor,
      created_by: row.created_by as Cluster['created_by'],
      confidence: row.confidence as number | undefined,
      created_at: row.created_at as string,
      valid_at: row.valid_at as string,
      invalid_at: row.invalid_at as string | null,
    };
  }

  private mapToMember(row: Record<string, unknown>): ClusterMember {
    return {
      entity_id: row.entity_id as string,
      role: row.role as MemberRole,
      position: row.position as number | undefined,
      added_at: row.added_at as string,
    };
  }
}
