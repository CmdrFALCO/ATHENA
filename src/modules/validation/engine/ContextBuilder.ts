import type { Entity } from '@/shared/types/entities';
import type { Connection } from '@/shared/types/connections';
import type { Cluster, ClusterMember } from '@/shared/types/clusters';
import type { ValidationContext } from '../types';

/**
 * ClusterMember with cluster_id for flat list representation.
 * When members are fetched from the database as a flat list,
 * each row includes the cluster_id it belongs to.
 */
export interface ClusterMemberWithClusterId extends ClusterMember {
  cluster_id: string;
}

export interface ContextBuilderInput {
  entities: Entity[];
  connections: Connection[];
  clusters: Cluster[];
  clusterMembers: ClusterMemberWithClusterId[];
}

/**
 * Builds a ValidationContext with pre-computed indexes.
 * All indexes are built once for O(1) lookups during rule evaluation.
 */
export function buildValidationContext(input: ContextBuilderInput): ValidationContext {
  const { entities, connections, clusters, clusterMembers } = input;

  // Build entityById index
  const entityById = new Map<string, Entity>();
  for (const entity of entities) {
    entityById.set(entity.id, entity);
  }

  // Build connectionsBySource index
  const connectionsBySource = new Map<string, Connection[]>();
  for (const conn of connections) {
    const existing = connectionsBySource.get(conn.source_id) || [];
    existing.push(conn);
    connectionsBySource.set(conn.source_id, existing);
  }

  // Build connectionsByTarget index
  const connectionsByTarget = new Map<string, Connection[]>();
  for (const conn of connections) {
    const existing = connectionsByTarget.get(conn.target_id) || [];
    existing.push(conn);
    connectionsByTarget.set(conn.target_id, existing);
  }

  // Build clustersByEntity index
  const clustersByEntity = new Map<string, Cluster[]>();
  const clusterById = new Map<string, Cluster>();
  for (const cluster of clusters) {
    clusterById.set(cluster.id, cluster);
  }
  for (const member of clusterMembers) {
    const cluster = clusterById.get(member.cluster_id);
    if (cluster) {
      const existing = clustersByEntity.get(member.entity_id) || [];
      existing.push(cluster);
      clustersByEntity.set(member.entity_id, existing);
    }
  }

  return {
    entities,
    connections,
    clusters,
    clusterMembers,
    entityById,
    connectionsBySource,
    connectionsByTarget,
    clustersByEntity,
  };
}
