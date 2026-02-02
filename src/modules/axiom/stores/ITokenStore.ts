/**
 * ITokenStore — Interface for token persistence
 *
 * Two implementations:
 * - InMemoryTokenStore (debug/testing)
 * - IndexedDBTokenStore (production)
 *
 * @module axiom/stores/ITokenStore
 */

import type { AetherToken } from '../types/token';
import type { TokenColor } from '../types/colorSets';

/**
 * Filter criteria for querying tokens.
 */
export interface TokenFilter {
  correlationId?: string;
  color?: TokenColor;
  currentPlace?: string;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * Interface for token persistence.
 */
export interface ITokenStore {
  // CRUD
  save(token: AetherToken): Promise<void>;
  get(tokenId: string): Promise<AetherToken | undefined>;
  getByCorrelationId(correlationId: string): Promise<AetherToken[]>;
  delete(tokenId: string): Promise<void>;

  // Bulk operations
  saveAll(tokens: AetherToken[]): Promise<void>;
  getAll(): Promise<AetherToken[]>;
  clear(): Promise<void>;

  // Cleanup (for IndexedDB retention policy)
  cleanup(retentionDays: number): Promise<number>;

  // Query
  query(filter: TokenFilter): Promise<AetherToken[]>;
}
