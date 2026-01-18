export type ConnectionType = 'explicit' | 'semantic' | 'validation';
export type ConnectionColor = 'blue' | 'green' | 'red' | 'amber';
export type ConnectionCreator = 'user' | 'ai' | 'system';
export type NodeType = 'entity' | 'resource';

export interface Connection {
  id: string; // UUID
  source_id: string; // FK to Entity or Resource
  target_id: string; // FK to Entity or Resource
  source_type: NodeType; // Type of source node (defaults to 'entity')
  target_type: NodeType; // Type of target node (defaults to 'entity')
  type: ConnectionType;
  color: ConnectionColor;
  label: string | null; // User-defined label
  confidence: number | null; // 0-1 for semantic connections
  created_by: ConnectionCreator;
  created_at: string; // ISO datetime
  valid_at: string; // Bi-temporal
  invalid_at: string | null; // Bi-temporal
}
