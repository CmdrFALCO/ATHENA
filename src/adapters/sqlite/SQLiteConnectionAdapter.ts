import type { Connection, ConnectionColor, ConnectionType, NodeType } from '@/shared/types';
import type { IConnectionAdapter } from '../IConnectionAdapter';
import type { DatabaseConnection } from '@/database';

export class SQLiteConnectionAdapter implements IConnectionAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getById(id: string): Promise<Connection | undefined> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE id = ? AND invalid_at IS NULL`,
      [id]
    );
    return results[0] ? this.mapToConnection(results[0]) : undefined;
  }

  async getAll(): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE invalid_at IS NULL`
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async create(
    connection: Omit<Connection, 'id' | 'created_at' | 'valid_at' | 'invalid_at'>
  ): Promise<Connection> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO connections (id, source_id, target_id, source_type, target_type, type, color, label, confidence, created_by, created_at, valid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        connection.source_id,
        connection.target_id,
        connection.source_type,
        connection.target_type,
        connection.type,
        connection.color,
        connection.label,
        connection.confidence,
        connection.created_by,
        now,
        now,
      ]
    );

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to create connection');
    }
    return result;
  }

  async update(
    id: string,
    updates: Partial<Pick<Connection, 'label' | 'confidence'>>
  ): Promise<Connection> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.label !== undefined) {
      setClauses.push('label = ?');
      values.push(updates.label);
    }
    if (updates.confidence !== undefined) {
      setClauses.push('confidence = ?');
      values.push(updates.confidence);
    }

    if (setClauses.length > 0) {
      values.push(id);
      await this.db.run(
        `UPDATE connections SET ${setClauses.join(', ')} WHERE id = ? AND invalid_at IS NULL`,
        values
      );
    }

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to update connection');
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.db.run(`UPDATE connections SET invalid_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  }

  async getConnectionsFor(entityId: string): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE (source_id = ? OR target_id = ?) AND invalid_at IS NULL`,
      [entityId, entityId]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getConnectionsBetween(sourceId: string, targetId: string): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections
       WHERE ((source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?))
       AND invalid_at IS NULL`,
      [sourceId, targetId, targetId, sourceId]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getOutgoing(entityId: string): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE source_id = ? AND invalid_at IS NULL`,
      [entityId]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getIncoming(entityId: string): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE target_id = ? AND invalid_at IS NULL`,
      [entityId]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getForNode(nodeType: NodeType, nodeId: string): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections
       WHERE invalid_at IS NULL
       AND (
         (source_type = ? AND source_id = ?)
         OR
         (target_type = ? AND target_id = ?)
       )`,
      [nodeType, nodeId, nodeType, nodeId]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getByColor(color: ConnectionColor): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE color = ? AND invalid_at IS NULL`,
      [color]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  async getByType(type: ConnectionType): Promise<Connection[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM connections WHERE type = ? AND invalid_at IS NULL`,
      [type]
    );
    return results.map((row) => this.mapToConnection(row));
  }

  // reason parameter reserved for future audit logging
  async invalidate(id: string, reason?: string): Promise<void> {
    void reason;
    await this.db.run(`UPDATE connections SET invalid_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  }

  private mapToConnection(row: Record<string, unknown>): Connection {
    return {
      id: row.id as string,
      source_id: row.source_id as string,
      target_id: row.target_id as string,
      source_type: (row.source_type as NodeType) ?? 'entity',
      target_type: (row.target_type as NodeType) ?? 'entity',
      type: row.type as ConnectionType,
      color: row.color as ConnectionColor,
      label: row.label as string | null,
      confidence: row.confidence as number | null,
      created_by: row.created_by as Connection['created_by'],
      created_at: row.created_at as string,
      valid_at: row.valid_at as string,
      invalid_at: row.invalid_at as string | null,
    };
  }
}
