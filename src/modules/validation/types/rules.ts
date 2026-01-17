import type { Entity } from '@/shared/types/entities';
import type { Connection } from '@/shared/types/connections';
import type { Cluster, ClusterMember } from '@/shared/types/clusters';
import type { Violation } from './violations';

/**
 * Severity levels for validation violations
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * What type of graph element the rule targets
 */
export type ValidationTarget = 'entity' | 'connection' | 'cluster' | 'graph';

/**
 * Context passed to rule evaluation.
 * Contains everything needed to validate the graph.
 */
export interface ValidationContext {
  entities: Entity[];
  connections: Connection[];
  clusters: Cluster[];
  clusterMembers: ClusterMember[];

  // Pre-built indexes for O(1) lookups
  entityById: Map<string, Entity>;
  connectionsBySource: Map<string, Connection[]>;
  connectionsByTarget: Map<string, Connection[]>;
  clustersByEntity: Map<string, Cluster[]>;
}

/**
 * A validation rule definition (SHACL-inspired).
 * Rules are pure functions that evaluate the graph context
 * and return any violations found.
 */
export interface ValidationRule {
  /** Unique identifier, e.g., 'orphan-note' */
  id: string;

  /** Human-readable name */
  name: string;

  /** Longer description for help/docs */
  description: string;

  /** Error or warning */
  severity: ValidationSeverity;

  /** What this rule checks */
  target: ValidationTarget;

  /** Which entity/connection types this applies to (empty = all) */
  appliesTo?: string[];

  /** Whether this rule is enabled by default */
  enabledByDefault: boolean;

  /**
   * The evaluation function — pure, no side effects.
   * Returns violations found (empty array = passed).
   */
  evaluate: (context: ValidationContext) => Violation[];
}
