/**
 * GraphRAG Context Builder Types
 * WP 7.2 - Context gathering for AI conversations
 * WP 8.8 - Multi-hop traversal with relevance decay
 */

/**
 * A single item gathered for AI context
 */
export interface ContextItem {
  id: string;
  type: 'entity' | 'resource';
  title: string;
  content: string; // Plain text content
  relevanceScore: number; // 0-1, higher = more relevant
  source:
    | 'selected'
    | 'similarity'
    | 'traversal'
    | 'document-tree'
    | `traversal_depth_${number}`; // WP 8.8: granular depth tracking
}

/**
 * Options for multi-hop graph traversal (WP 8.8)
 */
export interface TraversalOptions {
  /** Max hops from seed nodes (default: 2) */
  maxDepth: number;
  /** Score multiplier per hop — controls relevance decay (default: 0.5) */
  decayFactor: number;
  /** Total node budget — prevents explosion in dense graphs (default: 20) */
  maxNodes: number;
  /** Starting relevance score for depth 1 (default: 0.5) */
  baseScore: number;
  /** Optional: filter by connection type */
  connectionTypes?: string[];
}

/**
 * Options for context building
 */
export interface ContextOptions {
  /** Explicitly included nodes (from thread.contextNodeIds) */
  selectedNodeIds: string[];
  /** Explicitly selected resource IDs from canvas (WP 8.7.2) */
  selectedResourceIds?: string[];
  /** Current user message (for similarity search) */
  query: string;
  /** Maximum context items to include (default: 10) */
  maxItems?: number;
  /** Minimum similarity score for semantic search (default: 0.7) */
  similarityThreshold?: number;
  /** Whether to expand context via graph traversal (default: true) */
  includeTraversal?: boolean;
  /** How many hops to traverse (default: 2) */
  traversalDepth?: number;
  /** Score multiplier per hop (default: 0.5) (WP 8.8) */
  traversalDecay?: number;
  /** Total traversal node budget (default: 20) (WP 8.8) */
  maxTraversalNodes?: number;
}

/**
 * Result of context building
 */
export interface ContextResult {
  items: ContextItem[];
  /** Rough token count (chars / 4) */
  totalTokensEstimate: number;
  /** Whether we hit maxItems limit */
  truncated: boolean;
  /** Debug info for DevSettings */
  debug?: {
    selectedCount: number;
    resourceCount: number;
    similarCount: number;
    traversalCount: number;
  };
}

/**
 * Interface for context gathering strategies
 */
export interface IContextStrategy {
  readonly name: string;
  gather(...args: unknown[]): Promise<ContextItem[]>;
}
