/**
 * Preference Actions - Public API for preference learning
 * WP 8.4 - Preference Learning
 *
 * Lazy-initializes services on first use. All methods are safe to call
 * even if the database is not yet available (they will no-op or throw).
 */

import { preferenceState$ } from './preferenceState';
import { PreferenceTracker } from './PreferenceTracker';
import { ConfidenceAdjuster } from './ConfidenceAdjuster';
import { SQLitePreferenceAdapter } from './PreferenceAdapter';
import { getDatabase } from '@/database';
import type { NodeProposal, EdgeProposal } from '@/modules/chat/types';
import type { ConfidenceAdjustment } from './types';

// Lazy-initialized services
let tracker: PreferenceTracker | null = null;
let adjuster: ConfidenceAdjuster | null = null;

function getServices(): { tracker: PreferenceTracker; adjuster: ConfidenceAdjuster } {
  if (!tracker || !adjuster) {
    const db = getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }
    const adapter = new SQLitePreferenceAdapter(db);
    tracker = new PreferenceTracker(adapter);
    adjuster = new ConfidenceAdjuster(adapter);
  }
  return { tracker, adjuster };
}

export const preferenceActions = {
  /**
   * Record acceptance of a node proposal
   */
  async recordNodeAccept(
    proposal: NodeProposal,
    contextHash: string | null = null
  ): Promise<void> {
    try {
      const { tracker, adjuster } = getServices();
      await tracker.recordNodeAccept(proposal, contextHash);
      adjuster.invalidateCache();
    } catch (err) {
      console.warn('[Preferences] Failed to record node accept:', err);
    }
  },

  /**
   * Record rejection of a node proposal
   */
  async recordNodeReject(
    proposal: NodeProposal,
    contextHash: string | null = null
  ): Promise<void> {
    try {
      const { tracker, adjuster } = getServices();
      await tracker.recordNodeReject(proposal, contextHash);
      adjuster.invalidateCache();
    } catch (err) {
      console.warn('[Preferences] Failed to record node reject:', err);
    }
  },

  /**
   * Record acceptance of an edge proposal
   */
  async recordEdgeAccept(
    proposal: EdgeProposal,
    contextHash: string | null = null
  ): Promise<void> {
    try {
      const { tracker, adjuster } = getServices();
      await tracker.recordEdgeAccept(proposal, contextHash);
      adjuster.invalidateCache();
    } catch (err) {
      console.warn('[Preferences] Failed to record edge accept:', err);
    }
  },

  /**
   * Record rejection of an edge proposal
   */
  async recordEdgeReject(
    proposal: EdgeProposal,
    contextHash: string | null = null
  ): Promise<void> {
    try {
      const { tracker, adjuster } = getServices();
      await tracker.recordEdgeReject(proposal, contextHash);
      adjuster.invalidateCache();
    } catch (err) {
      console.warn('[Preferences] Failed to record edge reject:', err);
    }
  },

  /**
   * Get adjusted confidence for a node proposal
   */
  async adjustNodeConfidence(
    originalConfidence: number
  ): Promise<ConfidenceAdjustment> {
    try {
      const { adjuster } = getServices();
      return adjuster.adjustNodeConfidence(originalConfidence);
    } catch {
      return { original: originalConfidence, adjusted: originalConfidence, factors: [] };
    }
  },

  /**
   * Get adjusted confidence for a connection proposal
   */
  async adjustConnectionConfidence(
    originalConfidence: number
  ): Promise<ConfidenceAdjustment> {
    try {
      const { adjuster } = getServices();
      return adjuster.adjustConnectionConfidence(originalConfidence);
    } catch {
      return { original: originalConfidence, adjusted: originalConfidence, factors: [] };
    }
  },

  /**
   * Refresh statistics in state
   */
  async refreshStats(): Promise<void> {
    preferenceState$.loading.set(true);
    preferenceState$.error.set(null);

    try {
      const { tracker } = getServices();
      const stats = await tracker.getStats();
      preferenceState$.stats.set(stats);
      preferenceState$.lastRefresh.set(new Date().toISOString());
    } catch (error) {
      preferenceState$.error.set(
        error instanceof Error ? error.message : 'Failed to load stats'
      );
    } finally {
      preferenceState$.loading.set(false);
    }
  },

  /**
   * Clear all preference history
   */
  async clearHistory(): Promise<void> {
    try {
      const { tracker, adjuster } = getServices();
      await tracker.clearHistory();
      adjuster.invalidateCache();
      preferenceState$.stats.set(null);
    } catch (err) {
      console.warn('[Preferences] Failed to clear history:', err);
    }
  },
};

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_PREFERENCES__ =
    preferenceActions;
}
