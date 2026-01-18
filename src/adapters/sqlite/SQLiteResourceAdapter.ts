import type { Resource, ResourceType, CreateResourceInput, UpdateResourceInput } from '@/shared/types/resources';
import type { IResourceAdapter } from '../IResourceAdapter';
import type { DatabaseConnection } from '@/database';

export class SQLiteResourceAdapter implements IResourceAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async create(input: CreateResourceInput): Promise<Resource> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO resources (
        id, type, name, mime_type, file_size,
        storage_type, storage_key, user_notes,
        extraction_status, url, url_mode,
        position_x, position_y,
        created_at, updated_at, valid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.type,
        input.name,
        input.mimeType ?? null,
        input.fileSize ?? null,
        input.storageType,
        input.storageKey ?? null,
        input.userNotes ?? null,
        input.url ?? null,
        input.urlMode ?? null,
        input.positionX ?? null,
        input.positionY ?? null,
        now,
        now,
        now,
      ]
    );

    const result = await this.getById(id);
    if (!result) {
      throw new Error('Failed to create resource');
    }
    return result;
  }

  async getById(id: string): Promise<Resource | null> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM resources WHERE id = ? AND invalid_at IS NULL`,
      [id]
    );
    return results[0] ? this.mapToResource(results[0]) : null;
  }

  async getAll(): Promise<Resource[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM resources WHERE invalid_at IS NULL ORDER BY updated_at DESC`
    );
    return results.map((row) => this.mapToResource(row));
  }

  async update(id: string, input: UpdateResourceInput): Promise<Resource | null> {
    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    if (input.name !== undefined) {
      setClauses.push('name = ?');
      values.push(input.name);
    }
    if (input.userNotes !== undefined) {
      setClauses.push('user_notes = ?');
      values.push(input.userNotes);
    }
    if (input.extractedText !== undefined) {
      setClauses.push('extracted_text = ?');
      values.push(input.extractedText);
    }
    if (input.extractionStatus !== undefined) {
      setClauses.push('extraction_status = ?');
      values.push(input.extractionStatus);
    }
    if (input.extractionMethod !== undefined) {
      setClauses.push('extraction_method = ?');
      values.push(input.extractionMethod);
    }
    if (input.positionX !== undefined) {
      setClauses.push('position_x = ?');
      values.push(input.positionX);
    }
    if (input.positionY !== undefined) {
      setClauses.push('position_y = ?');
      values.push(input.positionY);
    }

    values.push(id);

    await this.db.run(
      `UPDATE resources SET ${setClauses.join(', ')} WHERE id = ? AND invalid_at IS NULL`,
      values
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    // Soft delete via bi-temporal invalidation
    await this.db.run(`UPDATE resources SET invalid_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  }

  async getByType(type: ResourceType): Promise<Resource[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM resources WHERE type = ? AND invalid_at IS NULL ORDER BY updated_at DESC`,
      [type]
    );
    return results.map((row) => this.mapToResource(row));
  }

  async getPendingExtraction(): Promise<Resource[]> {
    const results = await this.db.exec<Record<string, unknown>>(
      `SELECT * FROM resources WHERE extraction_status = 'pending' AND invalid_at IS NULL`
    );
    return results.map((row) => this.mapToResource(row));
  }

  async updatePosition(id: string, x: number, y: number): Promise<void> {
    await this.db.run(
      `UPDATE resources SET position_x = ?, position_y = ?, updated_at = ? WHERE id = ? AND invalid_at IS NULL`,
      [x, y, new Date().toISOString(), id]
    );
  }

  private mapToResource(row: Record<string, unknown>): Resource {
    return {
      id: row.id as string,
      type: row.type as ResourceType,
      name: row.name as string,
      mimeType: row.mime_type as string | undefined,
      fileSize: row.file_size as number | undefined,
      storageType: row.storage_type as Resource['storageType'],
      storageKey: row.storage_key as string | undefined,
      userNotes: row.user_notes as string | undefined,
      extractedText: row.extracted_text as string | undefined,
      extractionStatus: row.extraction_status as Resource['extractionStatus'],
      extractionMethod: row.extraction_method as Resource['extractionMethod'] | undefined,
      url: row.url as string | undefined,
      urlMode: row.url_mode as Resource['urlMode'] | undefined,
      positionX: row.position_x as number | undefined,
      positionY: row.position_y as number | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      validAt: row.valid_at as string,
      invalidAt: row.invalid_at as string | undefined,
    };
  }
}
