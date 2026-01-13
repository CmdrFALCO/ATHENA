export type ConnectionType = 'explicit' | 'semantic' | 'validation';
export type ConnectionColor = 'blue' | 'green' | 'red' | 'amber';
export type ConnectionCreator = 'user' | 'ai' | 'system';

export interface Connection {
  id: string; // UUID
  source_id: string; // FK to Entity
  target_id: string; // FK to Entity
  type: ConnectionType;
  color: ConnectionColor;
  label: string | null; // User-defined label
  confidence: number | null; // 0-1 for semantic connections
  created_by: ConnectionCreator;
  created_at: string; // ISO datetime
  valid_at: string; // Bi-temporal
  invalid_at: string | null; // Bi-temporal
}
