/**
 * Level 2: Constraint validation guards
 *
 * Graph integrity checks on PROPOSAL payloads. These map to
 * Phase 5A MVP rules and can be used as pre-flight checks
 * before the full validation engine runs.
 *
 * @module axiom/guards/constraints
 */

import type { AetherToken } from '../types/token';
import type { PROPOSAL } from '../types/colorSets';

/**
 * Check no self-loops in proposed edges.
 * An edge must not reference the same node as both source and target.
 */
export function noSelfLoops(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const { edges } = tokens[0].payload;
  return edges.every((edge) => {
    // Check both ID and title forms
    if (edge.fromId && edge.toId) {
      return edge.fromId !== edge.toId;
    }
    if (edge.fromTitle && edge.toTitle) {
      return edge.fromTitle !== edge.toTitle;
    }
    return true;
  });
}

/**
 * Check no duplicate edges in proposal.
 * No two edges should connect the same source->target pair with the same label.
 */
export function noDuplicateEdges(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const { edges } = tokens[0].payload;

  const seen = new Set<string>();
  for (const edge of edges) {
    const key =
      edge.fromId && edge.toId
        ? `${edge.fromId}:${edge.toId}:${edge.label}`
        : `${edge.fromTitle}:${edge.toTitle}:${edge.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

/**
 * Check all referenced nodes exist in the proposal's nodes array.
 * Edges that reference by title or ID should have a corresponding node.
 *
 * Note: Full check against the existing graph happens in WP 9A.4.
 * This only checks internal proposal consistency.
 */
export function referencedNodesExist(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const { nodes, edges } = tokens[0].payload;

  const proposedNodeIds = new Set(nodes.map((n) => n.id));
  const proposedTitles = new Set(nodes.map((n) => n.title));

  for (const edge of edges) {
    // If referencing by ID and ID is not a proposed node, fail
    // (unless the edge also has a title reference — it may reference existing nodes)
    if (edge.fromId && !proposedNodeIds.has(edge.fromId) && !edge.fromTitle) {
      return false;
    }
    if (edge.toId && !proposedNodeIds.has(edge.toId) && !edge.toTitle) {
      return false;
    }
  }
  return true;
}
