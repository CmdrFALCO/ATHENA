/**
 * Preference Tracker - Records user preference signals
 * WP 8.4 - Preference Learning
 *
 * Called by ProposalAcceptService when proposals are accepted/rejected.
 * Checks devSettings$.preferences.enabled before recording.
 */

import type { IPreferenceAdapter } from './PreferenceAdapter';
import type { PreferenceSignal, PreferenceStats } from './types';
import type { NodeProposal, EdgeProposal } from '@/modules/chat/types';
import { devSettings$ } from '@/config/devSettings';

export class PreferenceTracker {
  constructor(private adapter: IPreferenceAdapter) {}

  /**
   * Record acceptance of a node proposal
   */
  async recordNodeAccept(
    proposal: NodeProposal,
    contextHash: string | null,
    batchInfo?: { size: number; position: number }
  ): Promise<PreferenceSignal | null> {
    if (!devSettings$.preferences.enabled.get()) return null;

    return this.adapter.record({
      proposalType: 'note',
      action: 'accept',
      confidenceAtProposal: proposal.confidence,
      contextHash,
      metadata: {
        titleLength: proposal.title.length,
        contentLength: proposal.content?.length ?? 0,
        batchSize: batchInfo?.size,
        batchPosition: batchInfo?.position,
      },
    });
  }

  /**
   * Record rejection of a node proposal
   */
  async recordNodeReject(
    proposal: NodeProposal,
    contextHash: string | null,
    batchInfo?: { size: number; position: number }
  ): Promise<PreferenceSignal | null> {
    if (!devSettings$.preferences.enabled.get()) return null;

    return this.adapter.record({
      proposalType: 'note',
      action: 'reject',
      confidenceAtProposal: proposal.confidence,
      contextHash,
      metadata: {
        titleLength: proposal.title.length,
        contentLength: proposal.content?.length ?? 0,
        batchSize: batchInfo?.size,
        batchPosition: batchInfo?.position,
      },
    });
  }

  /**
   * Record acceptance of an edge proposal
   */
  async recordEdgeAccept(
    proposal: EdgeProposal,
    contextHash: string | null,
    batchInfo?: { size: number; position: number }
  ): Promise<PreferenceSignal | null> {
    if (!devSettings$.preferences.enabled.get()) return null;

    return this.adapter.record({
      proposalType: 'connection',
      action: 'accept',
      confidenceAtProposal: proposal.confidence,
      contextHash,
      metadata: {
        relationshipType: proposal.label || 'relates_to',
        batchSize: batchInfo?.size,
        batchPosition: batchInfo?.position,
      },
    });
  }

  /**
   * Record rejection of an edge proposal
   */
  async recordEdgeReject(
    proposal: EdgeProposal,
    contextHash: string | null,
    batchInfo?: { size: number; position: number }
  ): Promise<PreferenceSignal | null> {
    if (!devSettings$.preferences.enabled.get()) return null;

    return this.adapter.record({
      proposalType: 'connection',
      action: 'reject',
      confidenceAtProposal: proposal.confidence,
      contextHash,
      metadata: {
        relationshipType: proposal.label || 'relates_to',
        batchSize: batchInfo?.size,
        batchPosition: batchInfo?.position,
      },
    });
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<PreferenceStats> {
    return this.adapter.getStats();
  }

  /**
   * Get recent signals for analysis
   */
  async getRecentSignals(limit = 50): Promise<PreferenceSignal[]> {
    return this.adapter.getRecent(limit);
  }

  /**
   * Clear all preference data (for privacy/reset)
   */
  async clearHistory(): Promise<void> {
    await this.adapter.clearAll();
  }
}
