/**
 * Cluster types representing different relationship semantics
 */
export type ClusterType =
  | 'concept' // Semantic grouping ("these discuss X")
  | 'sequence' // Ordered relationship ("A then B then C")
  | 'hierarchy' // Parent-child ("A contains B, C, D")
  | 'contradiction' // Conflicting claims (validation)
  | 'dependency'; // Logical dependency (CPN)

/**
 * How an entity participates in a cluster
 */
export type MemberRole =
  | 'source' // Origin/cause
  | 'target' // Destination/effect
  | 'participant' // Equal member (most common)
  | 'hub' // Central node others connect through
  | 'evidence' // Supporting material
  | 'claim'; // Assertion being supported/contradicted

/**
 * Color classification for clusters (same as connections)
 */
export type ClusterColor = 'blue' | 'green' | 'red' | 'amber';

/**
 * Who created the cluster
 */
export type ClusterCreator = 'user' | 'ai' | 'system';

/**
 * A member of a cluster
 */
export interface ClusterMember {
  entity_id: string;
  role: MemberRole;
  position?: number; // For ordered clusters (sequence)
  added_at: string; // ISO datetime
}

/**
 * A Cluster is a semantic junction point.
 * Multiple entities can belong to the same cluster.
 * This enables N-way relationships without N² edges.
 */
export interface Cluster {
  id: string;

  // What this cluster represents
  label: string;
  description?: string;

  // Classification (uses same color system as connections)
  type: ClusterType;
  color: ClusterColor;

  // Members (loaded separately or joined)
  members?: ClusterMember[];

  // Provenance
  created_by: ClusterCreator;
  confidence?: number; // 0-1 for AI-suggested clusters

  // Timestamps
  created_at: string;

  // Bi-temporal
  valid_at: string;
  invalid_at: string | null;
}

/**
 * Input for creating a new cluster
 */
export type CreateClusterInput = Omit<
  Cluster,
  'id' | 'created_at' | 'valid_at' | 'invalid_at' | 'members'
> & {
  members: Omit<ClusterMember, 'added_at'>[];
};
