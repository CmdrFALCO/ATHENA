/**
 * GraphRAG Context Builder Types
 * WP 7.2 - Context gathering for AI conversations
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
  source: 'selected' | 'similarity' | 'traversal';
}

/**
 * Options for context building
 */
export interface ContextOptions {
  /** Explicitly included nodes (from thread.contextNodeIds) */
  selectedNodeIds: string[];
  /** Current user message (for similarity search) */
  query: string;
  /** Maximum context items to include (default: 10) */
  maxItems?: number;
  /** Minimum similarity score for semantic search (default: 0.7) */
  similarityThreshold?: number;
  /** Whether to expand context via graph traversal (default: true) */
  includeTraversal?: boolean;
  /** How many hops to traverse (default: 1) */
  traversalDepth?: number;
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
