/**
 * Louvain Algorithm Wrapper — WP 9B.7
 * Wraps graphology-communities-louvain behind IClusteringAlgorithm interface.
 */

import louvain from 'graphology-communities-louvain';
import type Graph from 'graphology';
import type { IClusteringAlgorithm } from '../types';

export class LouvainAlgorithm implements IClusteringAlgorithm {
  readonly name = 'louvain' as const;

  /**
   * Run Louvain community detection on a graphology graph.
   * Returns Map<nodeId, communityIndex>.
   */
  detect(
    graph: Graph,
    config: { resolution: number },
  ): Map<string, number> {
    // graphology-communities-louvain returns an object { nodeId: communityIndex }
    const assignments = louvain(graph, {
      resolution: config.resolution,
    });

    const result = new Map<string, number>();
    for (const [nodeId, communityIdx] of Object.entries(assignments)) {
      result.set(nodeId, communityIdx as number);
    }

    return result;
  }
}
