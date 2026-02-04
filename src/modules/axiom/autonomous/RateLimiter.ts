/**
 * Rate Limiter — WP 9B.2
 *
 * Enforces hourly, daily, and queue-depth limits on autonomous commits.
 * Uses in-memory ring buffer for fast hourly checks, falls back to
 * SQLite provenance adapter for daily limits.
 */

import type { AutonomousConfig, IProvenanceAdapter } from './types';

export class RateLimiter {
  /** In-memory ring buffer for fast hourly checks */
  private commitTimestamps: number[] = [];

  constructor(private provenanceAdapter: IProvenanceAdapter) {}

  /**
   * Check whether another auto-commit is allowed under current limits.
   */
  async canCommit(
    config: AutonomousConfig,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Fast in-memory check for hourly limit
    const recentHour = this.commitTimestamps.filter((t) => t > oneHourAgo).length;
    if (recentHour >= config.limits.maxAutoCommitsPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${recentHour}/${config.limits.maxAutoCommitsPerHour})`,
      };
    }

    // DB check for daily limit (more accurate, survives page refresh)
    const stats = await this.provenanceAdapter.getStats(24);
    if (stats.total >= config.limits.maxAutoCommitsPerDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${stats.total}/${config.limits.maxAutoCommitsPerDay})`,
      };
    }

    // Check pending review queue size
    const pending = await this.provenanceAdapter.getByStatus('pending_review');
    if (pending.length >= config.limits.maxPendingReview) {
      return {
        allowed: false,
        reason: `Review queue full (${pending.length}/${config.limits.maxPendingReview}). Review pending items first.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a commit timestamp in the in-memory ring buffer.
   */
  recordCommit(): void {
    this.commitTimestamps.push(Date.now());

    // Trim entries older than 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.commitTimestamps = this.commitTimestamps.filter((t) => t > cutoff);
  }

  /**
   * Get current hourly commit count (from in-memory buffer).
   */
  getHourlyCount(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.commitTimestamps.filter((t) => t > oneHourAgo).length;
  }

  /**
   * Reset the in-memory buffer (useful for testing).
   */
  reset(): void {
    this.commitTimestamps = [];
  }
}
