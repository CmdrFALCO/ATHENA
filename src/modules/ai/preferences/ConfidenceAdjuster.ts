/**
 * Confidence Adjuster - Adjusts AI confidence based on learned preferences
 * WP 8.4 - Preference Learning
 *
 * Uses historical accept/reject patterns to calibrate expectations.
 * Factors:
 *   1. Overall acceptance rate for the proposal type
 *   2. Confidence calibration (are rejected proposals overconfident?)
 *   3. Relative preference between notes vs connections
 */

import type { IPreferenceAdapter } from './PreferenceAdapter';
import type { ConfidenceAdjustment, AdjustmentFactor, PreferenceStats } from './types';
import { devSettings$ } from '@/config/devSettings';

export class ConfidenceAdjuster {
  private cachedStats: PreferenceStats | null = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(private adapter: IPreferenceAdapter) {}

  /**
   * Adjust confidence for a node proposal based on learning
   */
  async adjustNodeConfidence(
    originalConfidence: number
  ): Promise<ConfidenceAdjustment> {
    const config = devSettings$.preferences.get();

    if (!config.enabled) {
      return this.noAdjustment(originalConfidence);
    }

    const stats = await this.getStats();

    if (stats.totalSignals < config.minSignalsForAdjustment) {
      return this.noAdjustment(originalConfidence, 'Insufficient data');
    }

    const factors: AdjustmentFactor[] = [];
    let adjustment = 0;

    // Factor 1: Overall note acceptance rate
    const noteAcceptRate = stats.byType.note.acceptRate;
    if (noteAcceptRate !== 0) {
      const rateImpact = (noteAcceptRate - 0.5) * config.learningRate;
      factors.push({
        name: 'Note acceptance rate',
        impact: rateImpact,
        reason: `${(noteAcceptRate * 100).toFixed(0)}% of note proposals accepted`,
      });
      adjustment += rateImpact;
    }

    // Factor 2: Confidence calibration
    const { acceptedAvgConfidence, rejectedAvgConfidence } =
      stats.confidenceAnalysis;
    if (acceptedAvgConfidence > 0 && rejectedAvgConfidence > 0) {
      const calibrationGap = acceptedAvgConfidence - rejectedAvgConfidence;
      if (calibrationGap < 0) {
        // AI is overconfident on rejected items
        const calibrationImpact = calibrationGap * 0.5 * config.learningRate;
        factors.push({
          name: 'Confidence calibration',
          impact: calibrationImpact,
          reason: `Rejected proposals had higher avg confidence (${rejectedAvgConfidence.toFixed(2)}) than accepted (${acceptedAvgConfidence.toFixed(2)})`,
        });
        adjustment += calibrationImpact;
      }
    }

    const adjusted = Math.max(0, Math.min(1, originalConfidence + adjustment));

    return {
      original: originalConfidence,
      adjusted,
      factors,
    };
  }

  /**
   * Adjust confidence for a connection proposal based on learning
   */
  async adjustConnectionConfidence(
    originalConfidence: number
  ): Promise<ConfidenceAdjustment> {
    const config = devSettings$.preferences.get();

    if (!config.enabled) {
      return this.noAdjustment(originalConfidence);
    }

    const stats = await this.getStats();

    if (stats.totalSignals < config.minSignalsForAdjustment) {
      return this.noAdjustment(originalConfidence, 'Insufficient data');
    }

    const factors: AdjustmentFactor[] = [];
    let adjustment = 0;

    // Factor 1: Connection acceptance rate
    const connAcceptRate = stats.byType.connection.acceptRate;
    if (connAcceptRate !== 0) {
      const rateImpact = (connAcceptRate - 0.5) * config.learningRate;
      factors.push({
        name: 'Connection acceptance rate',
        impact: rateImpact,
        reason: `${(connAcceptRate * 100).toFixed(0)}% of connection proposals accepted`,
      });
      adjustment += rateImpact;
    }

    // Factor 2: Compare to note acceptance rate
    const noteAcceptRate = stats.byType.note.acceptRate;
    if (noteAcceptRate > 0 && connAcceptRate > 0) {
      const relativeRate = connAcceptRate - noteAcceptRate;
      if (Math.abs(relativeRate) > 0.1) {
        const relativeImpact = relativeRate * 0.3 * config.learningRate;
        factors.push({
          name: 'Relative preference',
          impact: relativeImpact,
          reason:
            relativeRate > 0
              ? 'User accepts connections more than notes'
              : 'User accepts notes more than connections',
        });
        adjustment += relativeImpact;
      }
    }

    const adjusted = Math.max(0, Math.min(1, originalConfidence + adjustment));

    return {
      original: originalConfidence,
      adjusted,
      factors,
    };
  }

  /**
   * Get cached stats (refresh if stale)
   */
  private async getStats(): Promise<PreferenceStats> {
    const now = Date.now();
    if (this.cachedStats && now - this.cacheTime < this.CACHE_TTL) {
      return this.cachedStats;
    }

    this.cachedStats = await this.adapter.getStats();
    this.cacheTime = now;
    return this.cachedStats;
  }

  /**
   * Clear the stats cache (call after new signals recorded)
   */
  invalidateCache(): void {
    this.cachedStats = null;
    this.cacheTime = 0;
  }

  private noAdjustment(
    original: number,
    reason?: string
  ): ConfidenceAdjustment {
    return {
      original,
      adjusted: original,
      factors: reason
        ? [{ name: 'No adjustment', impact: 0, reason }]
        : [],
    };
  }
}
