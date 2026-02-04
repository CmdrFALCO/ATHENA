/**
 * Community Detection Service — WP 9B.7
 * Main orchestrator for hierarchical community detection pipeline.
 *
 * Pipeline: clear old → build graph → cluster → hierarchy → colors →
 *           persist → summarize → embed → return hierarchy
 */

import Graph from 'graphology';
import type { ICommunityAdapter } from '@/adapters/ICommunityAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IAIService } from '@/modules/ai';
import { devSettings$ } from '@/config/devSettings';
import { GraphConverter } from './GraphConverter';
import { LouvainAlgorithm } from './algorithms/LouvainAlgorithm';
import { CommunitySummaryService } from './CommunitySummaryService';
import type {
  Community,
  CommunityHierarchy,
  CommunityStats,
  CommunityDetectionConfig,
  IClusteringAlgorithm,
} from './types';

export class CommunityDetectionService {
  private graphConverter: GraphConverter;
  private algorithm: IClusteringAlgorithm;
  private summaryService: CommunitySummaryService;

  constructor(
    private communityAdapter: ICommunityAdapter,
    noteAdapter: INoteAdapter,
    connectionAdapter: IConnectionAdapter,
    aiService: IAIService,
  ) {
    this.graphConverter = new GraphConverter(noteAdapter, connectionAdapter);
    this.algorithm = new LouvainAlgorithm();
    this.summaryService = new CommunitySummaryService(
      aiService,
      noteAdapter,
      communityAdapter,
    );
  }

  /**
   * Full detection pipeline: clear → detect → summarize → persist.
   */
  async detectCommunities(): Promise<CommunityHierarchy> {
    const config = this.getConfig();
    if (!config.enabled) {
      return { roots: [], levels: new Map(), entityToCommunities: new Map() };
    }

    console.log('[CommunityDetection] Starting detection pipeline...');

    // 1. Clear existing communities
    await this.communityAdapter.deleteAll();

    // 2. Build graphology graph
    const { graph, orphanIds, nodeCount, edgeCount } =
      await this.graphConverter.buildGraph();

    console.log(
      `[CommunityDetection] Graph: ${nodeCount} nodes, ${edgeCount} edges, ${orphanIds.length} orphans`,
    );

    // 3. Guard: not enough nodes to cluster
    if (nodeCount < 3) {
      console.log('[CommunityDetection] < 3 connected nodes, skipping');
      return { roots: [], levels: new Map(), entityToCommunities: new Map() };
    }

    // 4. Run hierarchical detection
    const allCommunities = this.buildHierarchy(graph, config);

    console.log(
      `[CommunityDetection] Detected ${allCommunities.length} communities`,
    );

    // 5. Assign colors
    this.assignColors(allCommunities);

    // 6. Persist all communities
    await this.communityAdapter.saveBatch(allCommunities);

    // 7. Generate summaries bottom-up
    try {
      await this.summaryService.summarizeAll(allCommunities);
      console.log('[CommunityDetection] Summaries generated');
    } catch (err) {
      console.warn('[CommunityDetection] Summary generation failed:', err);
    }

    // 8. Reset change counter
    await this.communityAdapter.resetChangeCount();

    // 9. Return hierarchy
    return this.communityAdapter.getHierarchy();
  }

  /**
   * Re-summarize only stale communities (cheaper than full redetection).
   */
  async refreshStaleSummaries(): Promise<void> {
    const stale = await this.communityAdapter.getStale();
    if (stale.length === 0) return;

    console.log(`[CommunityDetection] Refreshing ${stale.length} stale summaries`);

    for (const community of stale) {
      await this.summaryService.summarizeOne(community);
    }
  }

  /**
   * Get cached hierarchy from DB (no recomputation).
   */
  async getHierarchy(): Promise<CommunityHierarchy | null> {
    const stats = await this.communityAdapter.getStats();
    if (stats.totalCommunities === 0) return null;
    return this.communityAdapter.getHierarchy();
  }

  /**
   * Mark communities as stale when graph changes.
   * Called by entity/connection change hooks.
   */
  async invalidate(
    reason: 'entity_change' | 'connection_change',
  ): Promise<void> {
    const config = this.getConfig();
    if (!config.autoInvalidate) return;

    // Only invalidate if detection has run at least once
    const stats = await this.communityAdapter.getStats();
    if (stats.totalCommunities === 0) return;

    await this.communityAdapter.markAllStale();
    await this.communityAdapter.incrementChangeCount();

    console.log(`[CommunityDetection] Invalidated (${reason})`);
  }

  /**
   * Get stats for UI display.
   */
  async getStats(): Promise<CommunityStats> {
    return this.communityAdapter.getStats();
  }

  // ============================================
  // Private: Hierarchical detection
  // ============================================

  /**
   * Build hierarchical communities using Louvain at multiple levels.
   *
   * 1. Run Louvain on full graph → level 0
   * 2. Enforce size constraints (max/min cluster size)
   * 3. Build meta-graph from level 0 → run Louvain → level 1
   * 4. Repeat until maxLevels or single community
   */
  private buildHierarchy(
    graph: Graph,
    config: CommunityDetectionConfig,
  ): Community[] {
    const allCommunities: Community[] = [];
    const now = new Date().toISOString();

    // Level 0: cluster the full graph
    const level0Assignments = this.algorithm.detect(graph, {
      resolution: config.resolution,
    });

    // Group entities by community
    const level0Groups = this.groupByCommunity(level0Assignments);

    // Enforce size constraints
    const adjustedGroups = this.enforceSizeConstraints(
      level0Groups,
      graph,
      config,
    );

    // Create level 0 communities
    const level0Communities: Community[] = [];
    let communityIndex = 0;

    for (const memberIds of adjustedGroups.values()) {
      const community: Community = {
        id: crypto.randomUUID(),
        level: 0,
        parentCommunityId: null,
        childCommunityIds: [],
        memberEntityIds: memberIds,
        memberCount: memberIds.length,
        summary: null,
        keywords: [],
        embedding: null,
        algorithm: config.algorithm,
        modularity: 0,
        color: '',
        stale: false,
        createdAt: now,
        lastRefreshedAt: now,
      };
      level0Communities.push(community);
      communityIndex++;
    }

    allCommunities.push(...level0Communities);

    // Higher levels: build meta-graph and re-cluster
    let currentLevelCommunities = level0Communities;
    let currentLevel = 1;

    while (
      currentLevel < config.hierarchicalLevels &&
      currentLevelCommunities.length > 1
    ) {
      // Build meta-graph: each community becomes a node
      const metaGraph = this.buildMetaGraph(
        currentLevelCommunities,
        graph,
      );

      if (metaGraph.order < 2) break; // Can't cluster 1 node

      const metaAssignments = this.algorithm.detect(metaGraph, {
        resolution: config.resolution * 0.8, // Slightly lower resolution for coarser clustering
      });

      const metaGroups = this.groupByCommunity(metaAssignments);

      // Check if we actually got fewer communities
      if (metaGroups.size >= currentLevelCommunities.length) break;

      const nextLevelCommunities: Community[] = [];

      for (const childCommunityIds of metaGroups.values()) {
        // Collect all member entities from child communities
        const allMembers: string[] = [];
        const childIds: string[] = [];
        for (const childId of childCommunityIds) {
          const child = currentLevelCommunities.find((c) => c.id === childId);
          if (child) {
            allMembers.push(...child.memberEntityIds);
            childIds.push(child.id);
          }
        }

        const parentId = crypto.randomUUID();

        // Set parent on children
        for (const childId of childIds) {
          const child = allCommunities.find((c) => c.id === childId);
          if (child) {
            child.parentCommunityId = parentId;
          }
        }

        const parentCommunity: Community = {
          id: parentId,
          level: currentLevel,
          parentCommunityId: null,
          childCommunityIds: childIds,
          memberEntityIds: allMembers,
          memberCount: allMembers.length,
          summary: null,
          keywords: [],
          embedding: null,
          algorithm: config.algorithm,
          modularity: 0,
          color: '',
          stale: false,
          createdAt: now,
          lastRefreshedAt: now,
        };

        nextLevelCommunities.push(parentCommunity);
      }

      allCommunities.push(...nextLevelCommunities);
      currentLevelCommunities = nextLevelCommunities;
      currentLevel++;
    }

    return allCommunities;
  }

  /**
   * Group node IDs by community assignment index.
   */
  private groupByCommunity(
    assignments: Map<string, number>,
  ): Map<number, string[]> {
    const groups = new Map<number, string[]>();
    for (const [nodeId, communityIdx] of assignments) {
      const group = groups.get(communityIdx) || [];
      group.push(nodeId);
      groups.set(communityIdx, group);
    }
    return groups;
  }

  /**
   * Enforce maxClusterSize and minClusterSize constraints.
   *
   * - Communities > maxClusterSize: re-cluster subgraph at higher resolution
   * - Communities < minClusterSize: merge into nearest community by adjacency
   */
  private enforceSizeConstraints(
    groups: Map<number, string[]>,
    graph: Graph,
    config: CommunityDetectionConfig,
  ): Map<number, string[]> {
    const result = new Map<number, string[]>();
    let nextIdx = groups.size;

    // Pass 1: Split oversized communities
    for (const [idx, memberIds] of groups) {
      if (memberIds.length > config.maxClusterSize) {
        // Build subgraph and re-cluster at higher resolution
        const subgraph = this.buildSubgraph(graph, memberIds);
        if (subgraph.order >= 2) {
          const subAssignments = this.algorithm.detect(subgraph, {
            resolution: config.resolution * 1.5,
          });
          const subGroups = this.groupByCommunity(subAssignments);
          for (const subMembers of subGroups.values()) {
            result.set(nextIdx++, subMembers);
          }
        } else {
          result.set(idx, memberIds);
        }
      } else {
        result.set(idx, memberIds);
      }
    }

    // Pass 2: Merge undersized communities
    const tooSmall: number[] = [];
    for (const [idx, memberIds] of result) {
      if (memberIds.length < config.minClusterSize) {
        tooSmall.push(idx);
      }
    }

    for (const smallIdx of tooSmall) {
      const smallMembers = result.get(smallIdx);
      if (!smallMembers) continue;

      // Find nearest community by graph adjacency
      let bestTarget: number | null = null;
      let bestOverlap = 0;

      for (const [targetIdx, targetMembers] of result) {
        if (targetIdx === smallIdx) continue;
        // Count edges between small community and target
        let overlap = 0;
        for (const src of smallMembers) {
          for (const tgt of targetMembers) {
            if (graph.hasNode(src) && graph.hasNode(tgt) && graph.hasEdge(src, tgt)) {
              overlap++;
            }
          }
        }
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestTarget = targetIdx;
        }
      }

      if (bestTarget !== null) {
        // Merge into nearest
        const targetMembers = result.get(bestTarget)!;
        targetMembers.push(...smallMembers);
        result.delete(smallIdx);
      }
      // If no adjacent community found, keep the small one as-is
    }

    return result;
  }

  /**
   * Build a subgraph containing only the given node IDs.
   */
  private buildSubgraph(graph: Graph, nodeIds: string[]): Graph {
    const subgraph = new Graph({ type: 'undirected', multi: false });
    const nodeSet = new Set(nodeIds);

    for (const id of nodeIds) {
      if (graph.hasNode(id)) {
        subgraph.addNode(id, graph.getNodeAttributes(id));
      }
    }

    graph.forEachEdge((edge, attrs, source, target) => {
      if (nodeSet.has(source) && nodeSet.has(target)) {
        if (!subgraph.hasEdge(source, target)) {
          subgraph.addEdge(source, target, attrs);
        }
      }
    });

    return subgraph;
  }

  /**
   * Build meta-graph where each community becomes a node.
   * Edges = sum of inter-community connection weights.
   */
  private buildMetaGraph(
    communities: Community[],
    originalGraph: Graph,
  ): Graph {
    const metaGraph = new Graph({ type: 'undirected', multi: false });

    // Map entity → community ID for lookup
    const entityToCommunity = new Map<string, string>();
    for (const c of communities) {
      metaGraph.addNode(c.id);
      for (const entityId of c.memberEntityIds) {
        entityToCommunity.set(entityId, c.id);
      }
    }

    // Sum inter-community edge weights
    const edgeWeights = new Map<string, number>();
    originalGraph.forEachEdge((_edge, attrs, source, target) => {
      const srcCommunity = entityToCommunity.get(source);
      const tgtCommunity = entityToCommunity.get(target);
      if (srcCommunity && tgtCommunity && srcCommunity !== tgtCommunity) {
        const key = [srcCommunity, tgtCommunity].sort().join('|');
        const current = edgeWeights.get(key) || 0;
        edgeWeights.set(key, current + ((attrs.weight as number) || 1));
      }
    });

    for (const [key, weight] of edgeWeights) {
      const [src, tgt] = key.split('|');
      if (!metaGraph.hasEdge(src, tgt)) {
        metaGraph.addEdge(src, tgt, { weight });
      }
    }

    return metaGraph;
  }

  // ============================================
  // Private: Color assignment
  // ============================================

  /**
   * Assign pastel HSL colors to communities.
   * Top-level gets evenly spaced hues; children inherit with lightness variation.
   */
  private assignColors(communities: Community[]): void {
    // Find max level (top-level roots)
    const maxLevel = communities.length > 0
      ? Math.max(...communities.map((c) => c.level))
      : 0;

    const roots = communities.filter((c) => c.level === maxLevel);

    // Assign hues to top-level communities
    for (let i = 0; i < roots.length; i++) {
      const hue = Math.round((i * 360) / roots.length);
      roots[i].color = this.hslToHex(hue, 60, 70);

      // Assign children with lightness variation
      this.assignChildColors(
        roots[i].id,
        hue,
        communities,
      );
    }

    // Assign any remaining uncolored communities (shouldn't happen, but safety)
    for (const c of communities) {
      if (!c.color) {
        c.color = '#94a3b8'; // Neutral gray fallback
      }
    }
  }

  private assignChildColors(
    parentId: string,
    hue: number,
    allCommunities: Community[],
  ): void {
    const children = allCommunities.filter(
      (c) => c.parentCommunityId === parentId,
    );

    for (let i = 0; i < children.length; i++) {
      const lightness = Math.max(50, Math.min(85, 70 - 5 * i));
      children[i].color = this.hslToHex(hue, 60, lightness);

      // Recurse for deeper levels
      this.assignChildColors(children[i].id, hue, allCommunities);
    }
  }

  private hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const a = sNorm * Math.min(lNorm, 1 - lNorm);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // ============================================
  // Private: Config
  // ============================================

  private getConfig(): CommunityDetectionConfig {
    return devSettings$.community.peek();
  }
}

// ============================================
// Singleton Management
// ============================================

let serviceInstance: CommunityDetectionService | null = null;

export function initCommunityDetectionService(
  communityAdapter: ICommunityAdapter,
  noteAdapter: INoteAdapter,
  connectionAdapter: IConnectionAdapter,
  aiService: IAIService,
): CommunityDetectionService {
  serviceInstance = new CommunityDetectionService(
    communityAdapter,
    noteAdapter,
    connectionAdapter,
    aiService,
  );

  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__ATHENA_COMMUNITY_SERVICE__ =
      serviceInstance;
  }

  console.log('[CommunityDetection] Service initialized');
  return serviceInstance;
}

export function getCommunityDetectionService(): CommunityDetectionService | null {
  return serviceInstance;
}
