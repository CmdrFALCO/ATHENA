/**
 * Communities Hook — WP 9B.7
 * Provides community hierarchy, detection actions, highlight control, and stats.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { devSettings$ } from '@/config/devSettings';
import { useCommunityAdapter } from '@/adapters';
import { useAdapters } from '@/adapters';
import { useAI } from '@/modules/ai';
import {
  initCommunityDetectionService,
  getCommunityDetectionService,
} from '../CommunityDetectionService';
import { initGlobalQueryService } from '../GlobalQueryService';
import type { Community, CommunityHierarchy, CommunityStats } from '../types';

// ============================================
// Community highlight state (shared across components)
// ============================================

export const communityState$ = observable({
  highlightedCommunityId: null as string | null,
  highlightedMemberIds: [] as string[],
  hierarchy: null as CommunityHierarchy | null,
  stats: null as CommunityStats | null,
  isDetecting: false,
});

export function useCommunities() {
  const communityAdapter = useCommunityAdapter();
  const adapters = useAdapters();
  const { service: aiService } = useAI();
  const enabled = useSelector(() => devSettings$.community.enabled.get());

  const highlightedCommunityId = useSelector(
    () => communityState$.highlightedCommunityId.get(),
  );
  const highlightedMemberIds = useSelector(
    () => communityState$.highlightedMemberIds.get(),
  );
  const hierarchy = useSelector(() => communityState$.hierarchy.get());
  const stats = useSelector(() => communityState$.stats.get());
  const isDetecting = useSelector(() => communityState$.isDetecting.get());

  // Ensure service is initialized
  useEffect(() => {
    if (!getCommunityDetectionService()) {
      initCommunityDetectionService(
        communityAdapter,
        adapters.notes,
        adapters.connections,
        aiService,
      );
      initGlobalQueryService(aiService, communityAdapter);
    }
  }, [communityAdapter, adapters, aiService]);

  // Load hierarchy and stats on mount
  useEffect(() => {
    if (!enabled) return;

    const service = getCommunityDetectionService();
    if (!service) return;

    service.getHierarchy().then((h) => {
      communityState$.hierarchy.set(h);
    });
    service.getStats().then((s) => {
      communityState$.stats.set(s);
    });
  }, [enabled]);

  const detectCommunities = useCallback(async () => {
    const service = getCommunityDetectionService();
    if (!service) return;

    communityState$.isDetecting.set(true);
    try {
      const result = await service.detectCommunities();
      communityState$.hierarchy.set(result);
      const newStats = await service.getStats();
      communityState$.stats.set(newStats);
    } catch (err) {
      console.error('[useCommunities] Detection failed:', err);
    } finally {
      communityState$.isDetecting.set(false);
    }
  }, []);

  const refreshStale = useCallback(async () => {
    const service = getCommunityDetectionService();
    if (!service) return;

    await service.refreshStaleSummaries();
    const h = await service.getHierarchy();
    communityState$.hierarchy.set(h);
    const s = await service.getStats();
    communityState$.stats.set(s);
  }, []);

  const highlightCommunity = useCallback((communityId: string) => {
    const h = communityState$.hierarchy.peek();
    if (!h) return;

    // Find the community and get its members
    const allCommunities = Array.from(h.levels.values()).flat();
    const community = allCommunities.find((c) => c.id === communityId);
    if (!community) return;

    communityState$.highlightedCommunityId.set(communityId);
    communityState$.highlightedMemberIds.set(community.memberEntityIds);
  }, []);

  const clearHighlight = useCallback(() => {
    communityState$.highlightedCommunityId.set(null);
    communityState$.highlightedMemberIds.set([]);
  }, []);

  return {
    enabled,
    hierarchy,
    stats,
    isDetecting,
    highlightedCommunityId,
    highlightedMemberIds,
    detectCommunities,
    refreshStale,
    highlightCommunity,
    clearHighlight,
  };
}

/**
 * Get the community color for a specific entity.
 * Used by EntityNode for canvas tinting.
 */
export function useCommunityColorForEntity(entityId: string): string | null {
  const showColors = useSelector(
    () => devSettings$.community.ui.showCommunityColors.get(),
  );
  const enabled = useSelector(() => devSettings$.community.enabled.get());
  const hierarchy = useSelector(() => communityState$.hierarchy.get());

  if (!enabled || !showColors || !hierarchy) return null;

  // Find level 0 community for this entity
  const communityIds = hierarchy.entityToCommunities.get(entityId);
  if (!communityIds || communityIds.length === 0) return null;

  // Get the level-0 community (first match, most specific)
  const allCommunities = Array.from(hierarchy.levels.values()).flat();
  const community = allCommunities.find(
    (c) => communityIds.includes(c.id) && c.level === 0,
  );

  return community?.color ?? null;
}
