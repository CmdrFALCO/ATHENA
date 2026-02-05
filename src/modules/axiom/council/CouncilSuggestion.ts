/**
 * CouncilSuggestion — Heuristic for suggesting council mode
 * WP 9B.8
 *
 * Pure function, no LLM call. Checks context size, community span,
 * and keyword patterns to determine if council would be beneficial.
 */

import { devSettings$ } from '@/config/devSettings';

const COUNCIL_KEYWORDS = [
  'synthesize',
  'combine',
  'patterns across',
  'contradict',
  'conflict',
  'compare',
  'integrate',
  'reconcile',
  'contrast',
  'overview',
];

/**
 * Returns true when the current context suggests a council session
 * would produce better results than a single-shot LLM call.
 */
export function shouldSuggestCouncil(
  query: string,
  contextNodeIds: string[],
  communityIds?: string[],
): boolean {
  const councilConfig = devSettings$.axiom.council?.peek();

  if (!councilConfig?.enabled) return false;
  if (!councilConfig?.suggestions?.enabled) return false;

  const minContextNodes = councilConfig.suggestions.minContextNodes ?? 3;
  const crossCommunityThreshold = councilConfig.suggestions.crossCommunityThreshold ?? 2;

  // Criterion 1: Sufficient context nodes
  if (contextNodeIds.length >= minContextNodes) return true;

  // Criterion 2: Context spans multiple communities
  if (communityIds) {
    const uniqueCommunities = new Set(communityIds);
    if (uniqueCommunities.size >= crossCommunityThreshold) return true;
  }

  // Criterion 3: Query contains council-suggesting keywords
  const lowerQuery = query.toLowerCase();
  if (COUNCIL_KEYWORDS.some((kw) => lowerQuery.includes(kw))) return true;

  return false;
}
