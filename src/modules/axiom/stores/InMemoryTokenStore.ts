/**
 * InMemoryTokenStore — Map-based token store for testing and debug mode
 *
 * Simple in-memory implementation with no persistence.
 * All data is lost on page reload.
 *
 * @module axiom/stores/InMemoryTokenStore
 */

import type { AetherToken } from '../types/token';
import type { ITokenStore, TokenFilter } from './ITokenStore';

export class InMemoryTokenStore implements ITokenStore {
  private tokens = new Map<string, AetherToken>();

  async save(token: AetherToken): Promise<void> {
    this.tokens.set(token._meta.id, token);
  }

  async get(tokenId: string): Promise<AetherToken | undefined> {
    return this.tokens.get(tokenId);
  }

  async getByCorrelationId(correlationId: string): Promise<AetherToken[]> {
    const results: AetherToken[] = [];
    for (const token of this.tokens.values()) {
      if (token._meta.correlationId === correlationId) {
        results.push(token);
      }
    }
    return results;
  }

  async delete(tokenId: string): Promise<void> {
    this.tokens.delete(tokenId);
  }

  async saveAll(tokens: AetherToken[]): Promise<void> {
    for (const token of tokens) {
      this.tokens.set(token._meta.id, token);
    }
  }

  async getAll(): Promise<AetherToken[]> {
    return Array.from(this.tokens.values());
  }

  async clear(): Promise<void> {
    this.tokens.clear();
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString();

    let deleted = 0;
    for (const [id, token] of this.tokens.entries()) {
      if (token._meta.createdAt < cutoffStr) {
        this.tokens.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async query(filter: TokenFilter): Promise<AetherToken[]> {
    let results = Array.from(this.tokens.values());

    if (filter.correlationId) {
      results = results.filter(
        (t) => t._meta.correlationId === filter.correlationId,
      );
    }
    if (filter.color) {
      results = results.filter((t) => t.color === filter.color);
    }
    if (filter.currentPlace) {
      results = results.filter(
        (t) => t._meta.currentPlace === filter.currentPlace,
      );
    }
    if (filter.createdAfter) {
      results = results.filter(
        (t) => t._meta.createdAt >= filter.createdAfter!,
      );
    }
    if (filter.createdBefore) {
      results = results.filter(
        (t) => t._meta.createdAt <= filter.createdBefore!,
      );
    }

    return results;
  }
}
