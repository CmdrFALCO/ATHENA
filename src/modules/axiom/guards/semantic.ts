/**
 * Level 3: Semantic validation guards
 *
 * Stubs for future NLP/embedding-based validation.
 * All guards currently return true (pass). Full implementation
 * requires embedding service access, which comes in WP 9A.4.
 *
 * @module axiom/guards/semantic
 */

import type { GuardFunction } from '../types/transition';
import type { PROPOSAL } from '../types/colorSets';

/**
 * Check proposed connections have semantic relevance.
 * (embedding similarity above threshold)
 *
 * Stub: always passes.
 */
export function semanticallyRelevant(
  _threshold: number = 0.5,
): GuardFunction<PROPOSAL> {
  return () => true;
}

/**
 * Check proposed node content is coherent.
 * (content embedding similar to title embedding)
 *
 * Stub: always passes.
 */
export function contentCoherent(
  _threshold: number = 0.3,
): GuardFunction<PROPOSAL> {
  return () => true;
}

/**
 * Check proposal doesn't duplicate existing knowledge.
 * (no nodes too similar to existing notes)
 *
 * Stub: always passes.
 */
export function notDuplicate(
  _threshold: number = 0.95,
): GuardFunction<PROPOSAL> {
  return () => true;
}
