/**
 * Traversal Strategy
 * WP 7.2 - Expand context by following graph connections
 *
 * Finds nodes connected to the base set via 1-hop expansion.
 * These have lower relevance (0.5) since they are discovered, not directly relevant.
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { Connection, NodeType } from '@/shared/types';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { ContextItem, IContextStrategy } from './types';

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
   * Find nodes connected to the base set (1-hop expansion)
   *
   * @param baseIds - IDs of nodes to expand from
   * @param _depth - How many hops to traverse (currently only 1 supported)
   * @param limit - Maximum items to return
   */
  async gather(baseIds: string[], _depth: number, limit: number): Promise<ContextItem[]> {
    if (baseIds.length === 0 || limit <= 0) return [];

    const items: ContextItem[] = [];
    const visitedIds = new Set(baseIds); // Don't revisit base nodes

    // Get all connections for base nodes
    for (const baseId of baseIds) {
      if (items.length >= limit) break;

      // Get connections where this node is source or target
      const connections = await this.getConnectionsForNode(baseId);

      for (const conn of connections) {
        if (items.length >= limit) break;

        // Find the "other" end of the connection
        const otherId = conn.source_id === baseId ? conn.target_id : conn.source_id;
        const otherType: NodeType = conn.source_id === baseId ? conn.target_type : conn.source_type;

        if (visitedIds.has(otherId)) continue;
        visitedIds.add(otherId);

        // Load the connected node
        const item = await this.loadNode(otherId, otherType);
        if (item) {
          items.push({
            ...item,
            // Traversal items get lower relevance (discovered, not directly relevant)
            relevanceScore: 0.5,
            source: 'traversal',
          });
        }
      }
    }

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
    type: NodeType
  ): Promise<Omit<ContextItem, 'relevanceScore' | 'source'> | null> {
    if (type === 'entity') {
      const note = await this.noteAdapter.getById(id);
      if (note) {
        return {
          id: note.id,
          type: 'entity',
          title: note.title,
          content: this.extractContent(note.content),
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
