/**
 * IndexedDBTokenStore — Persistent token store using IndexedDB
 *
 * Follows the BlobStorageService pattern from src/services/blobStorage/.
 * Stores tokens with indexes for efficient querying.
 *
 * Database: athena_axiom
 * Store: tokens
 * Indexes: correlationId, color, currentPlace, createdAt
 *
 * @module axiom/stores/IndexedDBTokenStore
 */

import type { AetherToken } from '../types/token';
import type { ITokenStore, TokenFilter } from './ITokenStore';

const DB_NAME = 'athena_axiom';
const DB_VERSION = 1;
const STORE_NAME = 'tokens';

export class IndexedDBTokenStore implements ITokenStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: '_meta.id',
            });
            store.createIndex('correlationId', '_meta.correlationId', {
              unique: false,
            });
            store.createIndex('color', 'color', { unique: false });
            store.createIndex('currentPlace', '_meta.currentPlace', {
              unique: false,
            });
            store.createIndex('createdAt', '_meta.createdAt', {
              unique: false,
            });
          }
        };
      });
    }
    return this.dbPromise;
  }

  async save(token: AetherToken): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(token);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(tokenId: string): Promise<AetherToken | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(tokenId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? undefined);
    });
  }

  async getByCorrelationId(correlationId: string): Promise<AetherToken[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('correlationId');
      const request = index.getAll(correlationId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(tokenId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(tokenId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveAll(tokens: AetherToken[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      for (const token of tokens) {
        store.put(token);
      }
    });
  }

  async getAll(): Promise<AetherToken[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString();

    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');

      // Get all tokens older than cutoff
      const range = IDBKeyRange.upperBound(cutoffStr);
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  async query(filter: TokenFilter): Promise<AetherToken[]> {
    // For simple single-index queries, use the index directly
    if (
      filter.correlationId &&
      !filter.color &&
      !filter.currentPlace &&
      !filter.createdAfter &&
      !filter.createdBefore
    ) {
      return this.getByCorrelationId(filter.correlationId);
    }

    if (
      filter.color &&
      !filter.correlationId &&
      !filter.currentPlace &&
      !filter.createdAfter &&
      !filter.createdBefore
    ) {
      return this.queryByIndex('color', filter.color);
    }

    if (
      filter.currentPlace &&
      !filter.correlationId &&
      !filter.color &&
      !filter.createdAfter &&
      !filter.createdBefore
    ) {
      return this.queryByIndex('currentPlace', filter.currentPlace);
    }

    // For compound queries, fetch all and filter in memory
    const all = await this.getAll();
    return all.filter((token) => {
      if (
        filter.correlationId &&
        token._meta.correlationId !== filter.correlationId
      ) {
        return false;
      }
      if (filter.color && token.color !== filter.color) {
        return false;
      }
      if (
        filter.currentPlace &&
        token._meta.currentPlace !== filter.currentPlace
      ) {
        return false;
      }
      if (filter.createdAfter && token._meta.createdAt < filter.createdAfter) {
        return false;
      }
      if (
        filter.createdBefore &&
        token._meta.createdAt > filter.createdBefore
      ) {
        return false;
      }
      return true;
    });
  }

  private async queryByIndex(
    indexName: string,
    value: string,
  ): Promise<AetherToken[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}
