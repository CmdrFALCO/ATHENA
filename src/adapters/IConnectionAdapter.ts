import type { Connection, ConnectionColor, ConnectionType, NodeType } from '@/shared/types';

export interface IConnectionAdapter {
  // Basic CRUD
  getById(id: string): Promise<Connection | undefined>;
  getAll(): Promise<Connection[]>;
  create(
    connection: Omit<Connection, 'id' | 'created_at' | 'valid_at' | 'invalid_at'>
  ): Promise<Connection>;
  update(id: string, updates: Partial<Pick<Connection, 'label' | 'confidence'>>): Promise<Connection>;
  delete(id: string): Promise<void>;

  // Graph queries
  getConnectionsFor(entityId: string): Promise<Connection[]>;
  getConnectionsBetween(sourceId: string, targetId: string): Promise<Connection[]>;
  getOutgoing(entityId: string): Promise<Connection[]>;
  getIncoming(entityId: string): Promise<Connection[]>;

  // Unified node lookup (for entities and resources)
  getForNode(nodeType: NodeType, nodeId: string): Promise<Connection[]>;

  // Filtered queries
  getByColor(color: ConnectionColor): Promise<Connection[]>;
  getByType(type: ConnectionType): Promise<Connection[]>;

  // Bi-temporal
  invalidate(id: string, reason?: string): Promise<void>;
}
