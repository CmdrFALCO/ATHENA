/**
 * Threshold Adjuster Strategy Interface — WP 9B.3
 *
 * Strategy interface for dynamic threshold adjustment.
 * Swappable via DevSettings: 'static' | 'global_ratio' | 'per_factor'
 */

import type { AdjustedThresholds } from './types';

export interface IThresholdAdjuster {
  readonly name: string;

  /**
   * Adjust thresholds based on historical decision patterns.
   * @param baseThresholds - The configured base thresholds
   * @returns Adjusted thresholds (may be same as base if no adjustment needed)
   */
  adjust(baseThresholds: {
    autoAcceptEntity: number;
    autoAcceptConnection: number;
    autoRejectBelow: number;
  }): Promise<AdjustedThresholds>;
}
