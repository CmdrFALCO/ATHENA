import type { Note, EntityType } from '@/shared/types';
import type { INoteAdapter } from '../INoteAdapter';
import type { DatabaseConnection } from '@/database';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

export class SQLiteNoteAdapter implements INoteAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getById(id: string): Promise<Note | undefined> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM entities WHERE id = ? AND type = 'note' AND invalid_at IS NULL`,
      [id]
    );
    return results[0] ? this.mapToNote(results[0]) : undefined;
  }

  async getAll(): Promise<Note[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM entities WHERE type = 'note' AND invalid_at IS NULL ORDER BY updated_at DESC`
    );
    return results.map((row) => this.mapToNote(row));
  }

  async create(
    note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'valid_at' | 'invalid_at'>
  ): Promise<Note> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const contentText = extractTextFromTiptap(note.content);

    await this.db.run(
      `INSERT INTO entities (id, type, subtype, title, content, content_text, metadata, created_at, updated_at, valid_at, position_x, position_y)
       VALUES (?, 'note', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        note.subtype,
        note.title,
        JSON.stringify(note.content),
        contentText,
        JSON.stringify(note.metadata),
        now,
        now,
        now,
        note.position_x ?? 0,
        note.position_y ?? 0,
      ]
    );

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to create note');
    }
    return result;
  }

  async update(
    id: string,
    updates: Partial<
      Pick<Note, 'title' | 'content' | 'metadata' | 'subtype' | 'position_x' | 'position_y'>
    >
  ): Promise<Note> {
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      setClauses.push('content = ?');
      values.push(JSON.stringify(updates.content));
      // Also update content_text for FTS indexing
      setClauses.push('content_text = ?');
      values.push(extractTextFromTiptap(updates.content));
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.subtype !== undefined) {
      setClauses.push('subtype = ?');
      values.push(updates.subtype);
    }
    if (updates.position_x !== undefined) {
      setClauses.push('position_x = ?');
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      setClauses.push('position_y = ?');
      values.push(updates.position_y);
    }

    values.push(id);

    await this.db.run(
      `UPDATE entities SET ${setClauses.join(', ')} WHERE id = ? AND invalid_at IS NULL`,
      values
    );

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to update note');
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    // Soft delete via bi-temporal invalidation
    await this.db.run(`UPDATE entities SET invalid_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  }

  async findByType(type: EntityType): Promise<Note[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM entities WHERE type = ? AND invalid_at IS NULL`,
      [type]
    );
    return results.map((row) => this.mapToNote(row));
  }

  async findBySubtype(subtype: string): Promise<Note[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM entities WHERE type = 'note' AND subtype = ? AND invalid_at IS NULL`,
      [subtype]
    );
    return results.map((row) => this.mapToNote(row));
  }

  async findByTitle(search: string): Promise<Note[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM entities WHERE type = 'note' AND title LIKE ? AND invalid_at IS NULL`,
      [`%${search}%`]
    );
    return results.map((row) => this.mapToNote(row));
  }

  private mapToNote(row: Record<string, unknown>): Note {
    return {
      id: row.id as string,
      type: 'note',
      subtype: row.subtype as string,
      title: row.title as string,
      content: JSON.parse(row.content as string),
      metadata: JSON.parse((row.metadata as string) || '{}'),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      valid_at: row.valid_at as string,
      invalid_at: row.invalid_at as string | null,
      position_x: row.position_x as number,
      position_y: row.position_y as number,
    };
  }
}
