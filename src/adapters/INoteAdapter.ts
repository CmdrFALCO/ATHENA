import type { Note, EntityType } from '@/shared/types';

export interface INoteAdapter {
  // Basic CRUD
  getById(id: string): Promise<Note | undefined>;
  getAll(): Promise<Note[]>;
  create(
    note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'valid_at' | 'invalid_at'>
  ): Promise<Note>;
  update(
    id: string,
    updates: Partial<
      Pick<Note, 'title' | 'content' | 'metadata' | 'subtype' | 'position_x' | 'position_y'>
    >
  ): Promise<Note>;
  delete(id: string): Promise<void>;

  // Queries
  findByType(type: EntityType): Promise<Note[]>;
  findBySubtype(subtype: string): Promise<Note[]>;

  // Search (basic - full search comes in Phase 4)
  findByTitle(search: string): Promise<Note[]>;
}
