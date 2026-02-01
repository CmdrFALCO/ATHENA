/**
 * Traversal Strategy
 * WP 7.2 - Expand context by following graph connections
 * WP 8.8 - Multi-hop BFS with relevance decay
 *
 * Performs BFS traversal up to maxDepth hops from seed nodes.
 * Relevance score decays with distance: score = baseScore × decay^(depth-1)
 * Respects a total node budget (maxNodes) to prevent explosion in dense graphs.
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { Connection, NodeType } from '@/shared/types';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { ContextItem, IContextStrategy, TraversalOptions } from './types';

const DEFAULT_OPTIONS: TraversalOptions = {
  maxDepth: 2,
  decayFactor: 0.5,
  maxNodes: 20,
  baseScore: 0.5,
};

export class TraversalStrategy implements IContextStrategy {
  readonly name = 'traversal';
  private noteAdapter: INoteAdapter;
  private resourceAdapter: IResourceAdapter;
  private connectionAdapter: IConnectionAdapter;

  constructor(
    noteAdapter: INoteAdapter,
    resourceAdapter: IResourceAdapter,
    connectionAdapter: IConnectionAdapter
  ) {
    this.noteAdapter = noteAdapter;
    this.resourceAdapter = resourceAdapter;
    this.connectionAdapter = connectionAdapter;
  }

  /**
   * Gather context via multi-hop graph traversal with relevance decay.
   *
   * BFS ensures shortest-path discovery — nodes are found at their lowest depth,
   * giving them the highest possible relevance score.
   *
   * @param seedIds - Starting node IDs (already in context)
   * @param options - Traversal configuration (partial, merged with defaults)
   * @returns Context items sorted by relevance (highest first)
   */
  async gather(
    seedIds: string[],
    options: Partial<TraversalOptions> = {}
  ): Promise<ContextItem[]> {
    const {
      maxDepth,
      decayFactor,
      maxNodes,
      baseScore,
      connectionTypes,
    } = { ...DEFAULT_OPTIONS, ...options };

    // Skip if no seeds or traversal disabled
    if (seedIds.length === 0 || maxDepth < 1) {
      return [];
    }

    const visited = new Set<string>(seedIds); // Seeds are already in context
    const items: ContextItem[] = [];
    let currentLevel = new Set<string>(seedIds);
    let totalNodes = 0;

    // BFS by depth level
    for (let depth = 1; depth <= maxDepth && totalNodes < maxNodes; depth++) {
      const nextLevel = new Set<string>();
      const depthScore = baseScore * Math.pow(decayFactor, depth - 1);

      for (const nodeId of currentLevel) {
        if (totalNodes >= maxNodes) break;

        // Get connections for this node (both entity and resource connections)
        const connections = await this.getConnectionsForNode(nodeId);

        // Filter by connection type if specified
        const filtered = connectionTypes
          ? connections.filter(c => connectionTypes.includes(c.type))
          : connections;

        for (const conn of filtered) {
          if (totalNodes >= maxNodes) break;

          // Get the other end of the connection
          const neighborId = conn.source_id === nodeId ? conn.target_id : conn.source_id;
          const neighborType: NodeType = conn.source_id === nodeId ? conn.target_type : conn.source_type;

          // Skip if already visited
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);

          // Load the connected node
          const item = await this.loadNode(neighborId, neighborType, depthScore, depth);
          if (item) {
            items.push(item);
            nextLevel.add(neighborId);
            totalNodes++;
          }
        }
      }

      // Move to next level
      currentLevel = nextLevel;

      // Early exit if no more nodes to explore
      if (currentLevel.size === 0) break;
    }

    // Sort by relevance (highest first)
    items.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return items;
  }

  private async getConnectionsForNode(nodeId: string): Promise<Connection[]> {
    // ConnectionAdapter.getForNode returns connections where node is source or target
    // We need to try both entity and resource types
    const entityConnections = await this.connectionAdapter.getForNode('entity', nodeId);
    const resourceConnections = await this.connectionAdapter.getForNode('resource', nodeId);
    return [...entityConnections, ...resourceConnections];
  }

  private async loadNode(
    id: string,
    type: NodeType,
    score: number,
    depth: number
  ): Promise<ContextItem | null> {
    if (type === 'entity') {
      const note = await this.noteAdapter.getById(id);
      if (note) {
        return {
          id: note.id,
          type: 'entity',
          title: note.title,
          content: this.extractContent(note.content),
          relevanceScore: score,
          source: `traversal_depth_${depth}` as ContextItem['source'],
        };
      }
    } else {
      const resource = await this.resourceAdapter.getById(id);
      if (resource) {
        return {
          id: resource.id,
          type: 'resource',
          title: resource.name,
          content: resource.extractedText || resource.userNotes || '',
          relevanceScore: score,
          source: `traversal_depth_${depth}` as ContextItem['source'],
        };
      }
    }
    return null;
  }

  private extractContent(content: unknown): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return extractTextFromTiptap(content);
  }
}
