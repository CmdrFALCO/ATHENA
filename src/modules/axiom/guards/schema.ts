/**
 * Level 1: Schema validation guards
 *
 * Lightweight, synchronous checks that verify proposal structure
 * correctness before deeper validation. These examine the PROPOSAL
 * payload directly.
 *
 * @module axiom/guards/schema
 */

import type { AetherToken } from '../types/token';
import type { PROPOSAL } from '../types/colorSets';

/**
 * Check all nodes have required fields (id and non-empty title).
 */
export function nodesHaveRequiredFields(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const { nodes } = tokens[0].payload;
  return nodes.every(
    (node) =>
      node.id != null &&
      node.id.length > 0 &&
      node.title != null &&
      typeof node.title === 'string' &&
      node.title.trim().length > 0,
  );
}

/**
 * Check all edges have required fields (id, fromTitle, toTitle).
 */
export function edgesHaveRequiredFields(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const { edges } = tokens[0].payload;
  return edges.every(
    (edge) =>
      edge.id != null &&
      edge.id.length > 0 &&
      (edge.fromId || edge.fromTitle) &&
      (edge.toId || edge.toTitle),
  );
}

/**
 * Combined schema validation: proposal has content and all fields are present.
 */
export function schemaValid(
  tokens: AetherToken<PROPOSAL>[],
): boolean {
  if (tokens.length === 0) return false;
  const p = tokens[0].payload;
  // Must have at least one node or edge
  if (p.nodes.length === 0 && p.edges.length === 0) return false;
  return nodesHaveRequiredFields(tokens) && edgesHaveRequiredFields(tokens);
}
