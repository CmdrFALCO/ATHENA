/**
 * useTokens — Access token IDs in specific places
 * WP 9A.4: AXIOM Integration
 *
 * Provides reactive token data from the AXIOM state store.
 * Note: tokensByPlace stores token IDs (strings), not full token objects.
 */

import { useMemo } from 'react';
import { useSelector } from '@legendapp/state/react';
import { axiomState$ } from '../store/axiomState';
import type { PlaceId } from '../workflows/types';

/**
 * Get token IDs for a specific place, or all token IDs if no place specified.
 */
export function useTokens(placeId?: PlaceId): string[] {
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());

  return useMemo(() => {
    if (placeId) {
      return tokensByPlace[placeId] ?? [];
    }
    // Return all token IDs flattened
    return Object.values(tokensByPlace).flat();
  }, [tokensByPlace, placeId]);
}

/**
 * Get the count of tokens in a specific place, or total count.
 */
export function useTokenCount(placeId?: PlaceId): number {
  const tokens = useTokens(placeId);
  return tokens.length;
}

/**
 * Check if a specific token ID exists in any place.
 */
export function useHasToken(tokenId: string): boolean {
  const allTokens = useTokens();
  return useMemo(() => allTokens.includes(tokenId), [allTokens, tokenId]);
}

/**
 * Get the total token count from state directly (more efficient than useTokens).
 */
export function useTotalTokenCount(): number {
  return useSelector(() => axiomState$.totalTokens.get());
}
