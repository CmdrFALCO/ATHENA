// Entity Types
export type EntityType = 'note' | 'plan' | 'document';

export interface Entity {
  id: string; // UUID
  type: EntityType;
  subtype: string; // Template-defined (e.g., 'zettelkasten', 'decision_matrix')
  title: string;
  content: Block[]; // Tiptap JSON blocks
  metadata: Record<string, unknown>;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  valid_at: string; // Bi-temporal: when became true
  invalid_at: string | null; // Bi-temporal: when invalidated (null = current)
  position_x: number; // Canvas X position
  position_y: number; // Canvas Y position
}

// Tiptap JSON content block - matches Tiptap's JSONContent type
export interface Block {
  type: string;
  content?: Block[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// Note is an Entity with type = 'note'
export type Note = Entity & { type: 'note' };
export type Plan = Entity & { type: 'plan' };
export type Document = Entity & { type: 'document' };
