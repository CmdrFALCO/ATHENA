import type {
  Cluster,
  ClusterMember,
  ClusterType,
  ClusterColor,
  MemberRole,
  CreateClusterInput,
} from '@/shared/types';

export interface IClusterAdapter {
  // Basic CRUD
  getById(id: string): Promise<Cluster | undefined>;
  getAll(): Promise<Cluster[]>;
  create(input: CreateClusterInput): Promise<Cluster>;
  update(
    id: string,
    updates: Partial<Pick<Cluster, 'label' | 'description' | 'confidence'>>
  ): Promise<Cluster>;
  delete(id: string): Promise<void>;

  // Member management
  addMember(
    clusterId: string,
    entityId: string,
    role: MemberRole,
    position?: number
  ): Promise<ClusterMember>;
  removeMember(clusterId: string, entityId: string): Promise<void>;
  getMembers(clusterId: string): Promise<ClusterMember[]>;

  // Queries
  getClustersForEntity(entityId: string): Promise<Cluster[]>;
  getByType(type: ClusterType): Promise<Cluster[]>;
  getByColor(color: ClusterColor): Promise<Cluster[]>;

  // Validation-specific
  getViolations(): Promise<Cluster[]>; // color = 'red' or 'amber'

  // Bi-temporal
  invalidate(id: string, reason?: string): Promise<void>;
}
