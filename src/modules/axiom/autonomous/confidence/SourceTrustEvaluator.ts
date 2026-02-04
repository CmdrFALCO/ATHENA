/**
 * Source Trust Evaluator — WP 9B.3
 *
 * Evaluates source reliability based on domain/type with user overrides.
 *
 * Trust tiers:
 * - Trusted (.edu, .gov, arxiv, doi.org, etc.) -> 0.9
 * - Neutral (general web) -> 0.6
 * - Untrusted (user-flagged) -> 0.3
 * - User content (no external source) -> 0.8
 * - User override -> exact configured score
 */

import type { SourceTrustConfig, SourceTrustLevel } from './types';

export class SourceTrustEvaluator {
  constructor(private config: SourceTrustConfig) {}

  /**
   * Evaluate source quality score for a resource.
   * @param resource - Optional resource with URL/type metadata
   * @param isUserCreated - Whether content was directly created by user
   * @returns 0-1 trust score
   */
  evaluate(
    resource?: { url?: string; type?: string } | null,
    isUserCreated?: boolean,
  ): number {
    // User-created content with no external source
    if (!resource || isUserCreated) {
      return this.config.userContentScore;
    }

    const url = resource.url;
    if (!url) return this.config.neutralScore;

    const domain = this.extractDomain(url);
    if (!domain) return this.config.neutralScore;

    // Check user overrides first (highest priority)
    const override = this.findOverride(domain);
    if (override) {
      return this.trustLevelToScore(override);
    }

    // Check trusted domains
    if (this.matchesDomainList(domain, this.config.trustedDomains)) {
      return this.config.trustedScore;
    }

    // Check untrusted domains
    if (this.matchesDomainList(domain, this.config.untrustedDomains)) {
      return this.config.untrustedScore;
    }

    // Default: neutral
    return this.config.neutralScore;
  }

  /**
   * Extract domain from a URL string.
   * Handles both full URLs and bare domains.
   */
  private extractDomain(url: string): string | null {
    try {
      // Handle bare domains (no protocol)
      const normalized = url.includes('://') ? url : `https://${url}`;
      const parsed = new URL(normalized);
      return parsed.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Check if a domain matches a user override.
   * Checks exact match first, then suffix match.
   */
  private findOverride(domain: string): SourceTrustLevel | null {
    // Exact match
    if (this.config.userOverrides[domain]) {
      return this.config.userOverrides[domain];
    }

    // Suffix match (e.g., override for '.edu' matches 'mit.edu')
    for (const [pattern, level] of Object.entries(this.config.userOverrides)) {
      if (pattern.startsWith('.') && domain.endsWith(pattern)) {
        return level;
      }
      // Subdomain match (e.g., override for 'example.com' matches 'sub.example.com')
      if (domain === pattern || domain.endsWith(`.${pattern}`)) {
        return level;
      }
    }

    return null;
  }

  /**
   * Check if a domain matches any pattern in a domain list.
   * Supports suffix matching (e.g., '.edu' matches 'mit.edu').
   */
  private matchesDomainList(domain: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Suffix pattern (starts with '.') — e.g., '.edu' matches 'mit.edu'
      if (pattern.startsWith('.') && domain.endsWith(pattern)) {
        return true;
      }
      // Exact domain match — e.g., 'arxiv.org' matches 'arxiv.org'
      if (domain === pattern) {
        return true;
      }
      // Subdomain match — e.g., 'arxiv.org' matches 'sub.arxiv.org'
      if (domain.endsWith(`.${pattern}`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Convert a trust level to its numeric score.
   */
  private trustLevelToScore(level: SourceTrustLevel): number {
    switch (level) {
      case 'trusted':
        return this.config.trustedScore;
      case 'neutral':
        return this.config.neutralScore;
      case 'untrusted':
        return this.config.untrustedScore;
    }
  }

  /**
   * Update the evaluator's config (e.g., when DevSettings change).
   */
  updateConfig(config: SourceTrustConfig): void {
    this.config = config;
  }
}
