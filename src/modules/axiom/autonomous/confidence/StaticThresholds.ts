/**
 * Static Thresholds — WP 9B.3
 *
 * Trivial IThresholdAdjuster implementation that returns
 * base thresholds unchanged. Used when thresholdStrategy: 'static'.
 */

import type { IThresholdAdjuster } from './IThresholdAdjuster';
import type { AdjustedThresholds } from './types';

export class StaticThresholds implements IThresholdAdjuster {
  readonly name = 'static';

  async adjust(baseThresholds: {
    autoAcceptEntity: number;
    autoAcceptConnection: number;
    autoRejectBelow: number;
  }): Promise<AdjustedThresholds> {
    return {
      ...baseThresholds,
      wasAdjusted: false,
    };
  }
}
