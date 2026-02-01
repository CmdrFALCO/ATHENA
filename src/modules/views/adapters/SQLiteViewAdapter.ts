// src/modules/views/adapters/SQLiteViewAdapter.ts — WP 8.9: Smart Views

import type { IViewAdapter } from './IViewAdapter';
import type { SmartView, CreateViewInput, UpdateViewInput, ViewParameter } from '../types';
import type { DatabaseConnection } from '@/database';

/** Row shape returned by SELECT on smart_views */
interface SmartViewRow {
  id: string;
  name: string;
  description: string;
  sql: string;
  parameters: string; // JSON
  category: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * SQLite implementation of view persistence.
 * Uses the app's DatabaseConnection wrapper (async, returns objects).
 */
export class SQLiteViewAdapter implements IViewAdapter {
  constructor(private db: DatabaseConnection) {}

  async getAll(): Promise<SmartView[]> {
    const rows = await this.db.exec<SmartViewRow>(`
      SELECT id, name, description, sql, parameters, category, icon, created_at, updated_at
      FROM smart_views
      ORDER BY name ASC
    `);
    return rows.map((row) => this.rowToView(row));
  }

  async getById(id: string): Promise<SmartView | null> {
    const rows = await this.db.exec<SmartViewRow>(
      `SELECT id, name, description, sql, parameters, category, icon, created_at, updated_at
       FROM smart_views WHERE id = ?`,
      [id],
    );
    return rows.length > 0 ? this.rowToView(rows[0]) : null;
  }

  async create(input: CreateViewInput): Promise<SmartView> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO smart_views (id, name, description, sql, parameters, category, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.description,
        input.sql,
        JSON.stringify(input.parameters || []),
        input.category || 'user',
        input.icon || null,
        now,
        now,
      ],
    );

    return {
      id,
      name: input.name,
      description: input.description,
      sql: input.sql,
      parameters: input.parameters || [],
      category: input.category || 'user',
      icon: input.icon,
      createdBy: 'user',
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, input: UpdateViewInput): Promise<SmartView | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.sql !== undefined) {
      updates.push('sql = ?');
      values.push(input.sql);
    }
    if (input.parameters !== undefined) {
      updates.push('parameters = ?');
      values.push(JSON.stringify(input.parameters));
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      values.push(input.icon);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await this.db.run(
      `UPDATE smart_views SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.run('DELETE FROM smart_views WHERE id = ?', [id]);
    return true;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db.exec<{ id: string }>(
      'SELECT id FROM smart_views WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0;
  }

  private rowToView(row: SmartViewRow): SmartView {
    let parameters: ViewParameter[] = [];
    try {
      parameters = JSON.parse(row.parameters || '[]');
    } catch {
      parameters = [];
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sql: row.sql,
      parameters,
      category: row.category as SmartView['category'],
      icon: row.icon || undefined,
      createdBy: 'user',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
