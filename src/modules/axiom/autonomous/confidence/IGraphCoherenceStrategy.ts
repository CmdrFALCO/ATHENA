/**
 * Graph Coherence Strategy Interface — WP 9B.3
 *
 * Strategy interface for graph coherence evaluation.
 * Swappable via DevSettings: 'neighborhood' | 'type_statistics' | 'combined'
 */

export interface IGraphCoherenceStrategy {
  readonly name: string;

  /**
   * Evaluate how well a proposed connection fits existing graph patterns.
   * @param sourceId - Source entity ID
   * @param targetId - Target entity ID
   * @param connectionType - Optional connection type label
   * @returns 0-1 score (0 = no coherence, 1 = perfect fit)
   */
  evaluate(
    sourceId: string,
    targetId: string,
    connectionType?: string,
  ): Promise<number>;
}
