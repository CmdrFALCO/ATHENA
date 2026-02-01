import type { DatabaseConnection } from '@/database/init';
import type { KnowledgeSchema, CreateSchemaInput, UpdateSchemaInput } from '../types';

export interface ISchemaAdapter {
  getAll(): Promise<KnowledgeSchema[]>;
  getById(id: string): Promise<KnowledgeSchema | null>;
  getBuiltIn(): Promise<KnowledgeSchema[]>;
  getCustom(): Promise<KnowledgeSchema[]>;
  create(input: CreateSchemaInput): Promise<KnowledgeSchema>;
  update(id: string, input: UpdateSchemaInput): Promise<KnowledgeSchema | null>;
  delete(id: string): Promise<boolean>;
  incrementUsage(id: string): Promise<void>;
}

interface SchemaRow {
  id: string;
  name: string;
  description: string | null;
  note_types: string;
  connection_types: string;
  extraction_hints: string | null;
  is_built_in: number;
  created_at: string;
  usage_count: number;
}

export class SQLiteSchemaAdapter implements ISchemaAdapter {
  constructor(private db: DatabaseConnection) {}

  async getAll(): Promise<KnowledgeSchema[]> {
    const rows = await this.db.exec<SchemaRow>(
      `SELECT * FROM knowledge_schemas ORDER BY is_built_in DESC, usage_count DESC, name`
    );
    return rows.map(this.mapRow);
  }

  async getById(id: string): Promise<KnowledgeSchema | null> {
    const rows = await this.db.exec<SchemaRow>(
      `SELECT * FROM knowledge_schemas WHERE id = ?`,
      [id]
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async getBuiltIn(): Promise<KnowledgeSchema[]> {
    const rows = await this.db.exec<SchemaRow>(
      `SELECT * FROM knowledge_schemas WHERE is_built_in = 1 ORDER BY name`
    );
    return rows.map(this.mapRow);
  }

  async getCustom(): Promise<KnowledgeSchema[]> {
    const rows = await this.db.exec<SchemaRow>(
      `SELECT * FROM knowledge_schemas WHERE is_built_in = 0 ORDER BY usage_count DESC, name`
    );
    return rows.map(this.mapRow);
  }

  async create(input: CreateSchemaInput): Promise<KnowledgeSchema> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO knowledge_schemas
       (id, name, description, note_types, connection_types, extraction_hints, is_built_in, created_at, usage_count)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)`,
      [
        id,
        input.name,
        input.description,
        JSON.stringify(input.noteTypes),
        JSON.stringify(input.connectionTypes),
        JSON.stringify(input.extractionHints),
        now,
      ]
    );

    return {
      id,
      ...input,
      isBuiltIn: false,
      createdAt: now,
      usageCount: 0,
    };
  }

  async update(id: string, input: UpdateSchemaInput): Promise<KnowledgeSchema | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in schemas');
    }

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
    if (input.noteTypes !== undefined) {
      updates.push('note_types = ?');
      values.push(JSON.stringify(input.noteTypes));
    }
    if (input.connectionTypes !== undefined) {
      updates.push('connection_types = ?');
      values.push(JSON.stringify(input.connectionTypes));
    }
    if (input.extractionHints !== undefined) {
      updates.push('extraction_hints = ?');
      values.push(JSON.stringify(input.extractionHints));
    }

    if (updates.length === 0) return existing;

    values.push(id);
    await this.db.run(
      `UPDATE knowledge_schemas SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    if (existing.isBuiltIn) {
      throw new Error('Cannot delete built-in schemas');
    }

    await this.db.run(`DELETE FROM knowledge_schemas WHERE id = ?`, [id]);
    return true;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.db.run(
      `UPDATE knowledge_schemas SET usage_count = usage_count + 1 WHERE id = ?`,
      [id]
    );
  }

  private mapRow(row: SchemaRow): KnowledgeSchema {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      noteTypes: JSON.parse(row.note_types),
      connectionTypes: JSON.parse(row.connection_types),
      extractionHints: row.extraction_hints ? JSON.parse(row.extraction_hints) : [],
      isBuiltIn: row.is_built_in === 1,
      createdAt: row.created_at,
      usageCount: row.usage_count,
    };
  }
}
