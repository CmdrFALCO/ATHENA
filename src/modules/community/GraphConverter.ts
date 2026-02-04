/**
 * Graph Converter — WP 9B.7
 * Converts ATHENA entities + connections to a graphology Graph for clustering.
 */

import Graph from 'graphology';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';

export interface GraphConversionResult {
  graph: Graph;
  orphanIds: string[]; // Entities with degree 0 (can't be clustered)
  nodeCount: number;
  edgeCount: number;
}

export class GraphConverter {
  constructor(
    private noteAdapter: INoteAdapter,
    private connectionAdapter: IConnectionAdapter,
  ) {}

  /**
   * Build an undirected graphology Graph from ATHENA entities and connections.
   *
   * - Nodes = entities (id as key, title as attribute)
   * - Edges = connections (weight = confidence score if available, else 1.0)
   * - Orphan entities (degree 0) tracked but excluded from graph
   */
  async buildGraph(): Promise<GraphConversionResult> {
    // 1. Load all entities and connections
    const entities = await this.noteAdapter.getAll();
    const connections = await this.connectionAdapter.getAll();

    // 2. Create undirected graph
    const graph = new Graph({ type: 'undirected', multi: false });

    // 3. Add all entities as nodes
    for (const entity of entities) {
      graph.addNode(entity.id, { title: entity.title });
    }

    // 4. Add connections as edges
    const entityIds = new Set(entities.map((e) => e.id));
    for (const conn of connections) {
      // Only add edges between entities that exist in the graph
      if (entityIds.has(conn.source_id) && entityIds.has(conn.target_id)) {
        // Avoid duplicate edges in undirected graph
        if (!graph.hasEdge(conn.source_id, conn.target_id)) {
          graph.addEdge(conn.source_id, conn.target_id, {
            weight: conn.confidence ?? 1.0,
          });
        }
      }
    }

    // 5. Identify orphans (degree 0)
    const orphanIds: string[] = [];
    graph.forEachNode((nodeId) => {
      if (graph.degree(nodeId) === 0) {
        orphanIds.push(nodeId);
      }
    });

    // Remove orphans from graph (they can't be clustered)
    for (const id of orphanIds) {
      graph.dropNode(id);
    }

    return {
      graph,
      orphanIds,
      nodeCount: graph.order,
      edgeCount: graph.size,
    };
  }
}
