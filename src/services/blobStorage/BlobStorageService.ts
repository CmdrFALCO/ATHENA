import type { IBlobStorage } from './IBlobStorage';

const DB_NAME = 'athena-blobs';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface BlobRecord {
  id: string;
  data: Blob;
  size: number;
  mimeType: string;
  createdAt: string;
}

/**
 * IndexedDB-based blob storage for resource files
 *
 * Storage format:
 * - key: Generated UUID (e.g., 'blob_abc123')
 * - value: { id, data: Blob, size: number, mimeType: string, createdAt: string }
 */
export class BlobStorageService implements IBlobStorage {
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
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      });
    }
    return this.dbPromise;
  }

  async store(file: File): Promise<string> {
    const db = await this.getDb();
    const key = `blob_${crypto.randomUUID()}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: BlobRecord = {
        id: key,
        data: file, // File extends Blob, IndexedDB stores it directly
        size: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      };

      const request = store.put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(key);
    });
  }

  async retrieve(key: string): Promise<Blob | null> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result as BlobRecord | undefined;
        resolve(record ? record.data : null);
      };
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSize(key: string): Promise<number | null> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result as BlobRecord | undefined;
        resolve(record ? record.size : null);
      };
    });
  }

  async exists(key: string): Promise<boolean> {
    const size = await this.getSize(key);
    return size !== null;
  }
}
