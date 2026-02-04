/**
 * Neighborhood Coherence Strategy — WP 9B.3
 *
 * Evaluates graph coherence by analyzing shared neighbors
 * (triangle closure) between source and target entities.
 *
 * Score interpretation:
 * - Neither has connections: 0.5 (neutral — new entities)
 * - Only one has connections: 0.4 (slightly below neutral)
 * - Both connected but no shared neighbors: 0.3
 * - Shared neighbors: 0.5 + (sharedCount / maxNeighbors) * 0.5
 */

import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IGraphCoherenceStrategy } from './IGraphCoherenceStrategy';

export class NeighborhoodCoherenceStrategy implements IGraphCoherenceStrategy {
  readonly name = 'neighborhood';

  constructor(private connectionAdapter: IConnectionAdapter) {}

  async evaluate(
    sourceId: string,
    targetId: string,
    _connectionType?: string,
  ): Promise<number> {
    // Get all connections for source and target
    const [sourceConns, targetConns] = await Promise.all([
      this.connectionAdapter.getConnectionsFor(sourceId),
      this.connectionAdapter.getConnectionsFor(targetId),
    ]);

    // Build neighbor sets (excluding the entity itself)
    const sourceNeighbors = new Set<string>();
    for (const conn of sourceConns) {
      const neighbor =
        conn.source_id === sourceId ? conn.target_id : conn.source_id;
      if (neighbor !== targetId) {
        sourceNeighbors.add(neighbor);
      }
    }

    const targetNeighbors = new Set<string>();
    for (const conn of targetConns) {
      const neighbor =
        conn.source_id === targetId ? conn.target_id : conn.source_id;
      if (neighbor !== sourceId) {
        targetNeighbors.add(neighbor);
      }
    }

    const sourceHasConns = sourceNeighbors.size > 0 || sourceConns.length > 0;
    const targetHasConns = targetNeighbors.size > 0 || targetConns.length > 0;

    // Neither has connections — can't judge, return neutral
    if (!sourceHasConns && !targetHasConns) {
      return 0.5;
    }

    // Only one has connections — slightly below neutral
    if (!sourceHasConns || !targetHasConns) {
      return 0.4;
    }

    // Find shared neighbors (triangle closure)
    const sharedNeighbors = new Set<string>();
    for (const neighbor of sourceNeighbors) {
      if (targetNeighbors.has(neighbor)) {
        sharedNeighbors.add(neighbor);
      }
    }

    const sharedCount = sharedNeighbors.size;

    // Both have connections but no shared neighbors
    if (sharedCount === 0) {
      return 0.3;
    }

    // Shared neighbors present: scale score
    const maxNeighbors = Math.max(sourceNeighbors.size, targetNeighbors.size);
    const ratio = maxNeighbors > 0 ? sharedCount / maxNeighbors : 0;
    const score = 0.5 + ratio * 0.5;

    return Math.min(1.0, score);
  }
}
