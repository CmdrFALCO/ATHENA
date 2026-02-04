/**
 * Global Ratio Adjuster — WP 9B.3
 *
 * Adjusts thresholds based on overall accept/reject ratio.
 *
 * Logic:
 * - Get recent N decisions from ProvenanceAdapter
 * - Compute rejection rate = (rejected + reverted) / total
 * - If rejectionRate > tightenAbove: increase autoAccept by adjustmentStep
 * - If rejectionRate < loosenBelow: decrease autoAccept by adjustmentStep * 0.5
 * - Clamp to [minThreshold, maxThreshold]
 *
 * Tightening is faster than loosening (trust is hard to earn, easy to lose).
 */

import type { IThresholdAdjuster } from './IThresholdAdjuster';
import type { ProvenanceAdapter } from '../ProvenanceAdapter';
import type { AdjustedThresholds, DynamicAdjustmentConfig, ThresholdAdjustment } from './types';

export class GlobalRatioAdjuster implements IThresholdAdjuster {
  readonly name = 'global_ratio';

  constructor(
    private config: DynamicAdjustmentConfig,
    private provenanceAdapter: ProvenanceAdapter,
  ) {}

  async adjust(baseThresholds: {
    autoAcceptEntity: number;
    autoAcceptConnection: number;
    autoRejectBelow: number;
  }): Promise<AdjustedThresholds> {
    if (!this.config.enabled) {
      return { ...baseThresholds, wasAdjusted: false };
    }

    // 1. Get recent decision stats
    const stats = await this.provenanceAdapter.getRecentDecisionStats(
      this.config.windowSize,
    );

    // Not enough data — don't adjust
    if (stats.total < 5) {
      return { ...baseThresholds, wasAdjusted: false };
    }

    // 2. Compute rejection rate
    const rejections = stats.humanReverted + stats.autoRejected;
    const rejectionRate = rejections / stats.total;

    // 3. Determine adjustment
    let entityAdjust = 0;
    let connectionAdjust = 0;
    let rejectAdjust = 0;
    let reason = '';

    if (rejectionRate > this.config.tightenAbove) {
      // Too many rejections — tighten thresholds
      entityAdjust = this.config.adjustmentStep;
      connectionAdjust = this.config.adjustmentStep;
      rejectAdjust = this.config.adjustmentStep * 0.5; // Raise reject floor too
      reason = `Rejection rate ${(rejectionRate * 100).toFixed(0)}% exceeds ${(this.config.tightenAbove * 100).toFixed(0)}% — tightening`;
    } else if (rejectionRate < this.config.loosenBelow) {
      // Very few rejections — cautiously loosen
      entityAdjust = -this.config.adjustmentStep * 0.5; // Loosen slower
      connectionAdjust = -this.config.adjustmentStep * 0.5;
      rejectAdjust = 0; // Don't lower reject threshold
      reason = `Rejection rate ${(rejectionRate * 100).toFixed(0)}% below ${(this.config.loosenBelow * 100).toFixed(0)}% — loosening`;
    } else {
      // In acceptable range — no adjustment
      return { ...baseThresholds, wasAdjusted: false };
    }

    // 4. Apply adjustments with clamping
    const newEntity = this.clamp(
      baseThresholds.autoAcceptEntity + entityAdjust,
    );
    const newConnection = this.clamp(
      baseThresholds.autoAcceptConnection + connectionAdjust,
    );
    const newReject = Math.max(
      this.config.minThreshold * 0.5, // Reject floor can be lower
      Math.min(
        baseThresholds.autoRejectBelow + rejectAdjust,
        newEntity - 0.1, // Always keep a gap
      ),
    );

    // 5. Record adjustment if changed
    const wasAdjusted =
      newEntity !== baseThresholds.autoAcceptEntity ||
      newConnection !== baseThresholds.autoAcceptConnection;

    if (wasAdjusted) {
      const adjustment: ThresholdAdjustment = {
        id: `adj_${Date.now()}`,
        timestamp: new Date().toISOString(),
        strategy: this.name,
        previousAutoAccept: baseThresholds.autoAcceptEntity,
        newAutoAccept: newEntity,
        previousAutoReject: baseThresholds.autoRejectBelow,
        newAutoReject: newReject,
        rejectionRate,
        windowSize: this.config.windowSize,
        reason,
      };

      await this.provenanceAdapter.recordThresholdAdjustment(adjustment);
    }

    return {
      autoAcceptEntity: newEntity,
      autoAcceptConnection: newConnection,
      autoRejectBelow: newReject,
      wasAdjusted,
      adjustmentReason: wasAdjusted ? reason : undefined,
    };
  }

  /**
   * Clamp a threshold value to the configured bounds.
   */
  private clamp(value: number): number {
    return Math.max(this.config.minThreshold, Math.min(this.config.maxThreshold, value));
  }

  /**
   * Update config (e.g., when DevSettings change).
   */
  updateConfig(config: DynamicAdjustmentConfig): void {
    this.config = config;
  }
}
