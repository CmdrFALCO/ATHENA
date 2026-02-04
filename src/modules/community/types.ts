/**
 * Community Detection Types — WP 9B.7
 * Hierarchical Louvain clustering with LLM summaries and global queries
 */

// ============================================
// Core Data Types
// ============================================

export interface Community {
  id: string;
  level: number; // 0 = leaf, higher = coarser
  parentCommunityId: string | null;
  childCommunityIds: string[];
  memberEntityIds: string[];
  memberCount: number;
  summary: string | null; // LLM-generated
  keywords: string[]; // Extracted from summary
  embedding: number[] | null; // Summary embedding for semantic search
  algorithm: 'louvain' | 'leiden';
  modularity: number; // Quality score from algorithm
  color: string; // Hex color for canvas tinting
  stale: boolean; // Invalidated by graph changes
  createdAt: string;
  lastRefreshedAt: string;
}

export interface CommunityHierarchy {
  roots: Community[]; // Top-level communities
  levels: Map<number, Community[]>;
  entityToCommunities: Map<string, string[]>; // entity → community IDs at all levels
}

export interface CommunitySearchResult {
  community: Community;
  relevanceScore: number;
  memberPreviews: Array<{ id: string; title: string }>; // Top 5 members
}

// ============================================
// Configuration
// ============================================

export interface CommunityDetectionConfig {
  enabled: boolean;
  algorithm: 'louvain' | 'leiden';
  resolution: number; // Louvain resolution (default: 1.0)
  maxClusterSize: number; // Split trigger (default: 12)
  minClusterSize: number; // Merge trigger (default: 2)
  hierarchicalLevels: number; // Max depth (default: 3)
  autoInvalidate: boolean; // Mark stale on graph changes (default: true)
  globalQuery: {
    enabled: boolean;
    signalWords: string[]; // Words that trigger global query mode
  };
  ui: {
    showCommunityColors: boolean;
    showStaleIndicator: boolean;
    communityPanelDefaultOpen: boolean;
  };
}

// ============================================
// Algorithm Interface
// ============================================

export interface IClusteringAlgorithm {
  detect(graph: unknown, config: { resolution: number }): Map<string, number>;
  readonly name: string;
}

// ============================================
// Stats
// ============================================

export interface CommunityStats {
  totalCommunities: number;
  levels: number;
  largestCommunity: number;
  smallestCommunity: number;
  averageSize: number;
  staleCount: number;
  changesSinceDetection: number;
  lastDetectedAt: string | null;
}
