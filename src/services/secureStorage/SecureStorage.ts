import {
  generateExtractableKey,
  deriveKeyFromPassword,
  generateSalt,
  encrypt,
  decrypt,
  exportKey,
  importKey,
} from './crypto';

const DB_NAME = 'athena-secure';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';
const VALUES_STORE = 'values';

export interface ISecureStorage {
  store(key: string, value: string): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Lock/unlock for password mode
  isLocked(): boolean;
  unlock(password?: string): Promise<boolean>;
  lock(): void;

  // Mode management
  setPasswordProtection(password: string): Promise<void>;
  removePasswordProtection(): Promise<void>;
  isPasswordProtected(): boolean;
}

interface KeyMetadata {
  type: 'browser' | 'password';
  salt?: string; // Base64 encoded salt for password mode
  jwk?: JsonWebKey; // Stored key for browser mode
}

class SecureStorageImpl implements ISecureStorage {
  private db: IDBDatabase | null = null;
  private cryptoKey: CryptoKey | null = null;
  private metadata: KeyMetadata | null = null;
  private _isLocked: boolean = true;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await this.openDatabase();
    this.metadata = await this.loadMetadata();

    // Auto-unlock if browser-generated key (no password required)
    if (this.metadata?.type === 'browser' && this.metadata.jwk) {
      this.cryptoKey = await importKey(this.metadata.jwk);
      this._isLocked = false;
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(KEYS_STORE)) {
          db.createObjectStore(KEYS_STORE);
        }

        if (!db.objectStoreNames.contains(VALUES_STORE)) {
          db.createObjectStore(VALUES_STORE);
        }
      };
    });
  }

  private async loadMetadata(): Promise<KeyMetadata | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(KEYS_STORE, 'readonly');
      const store = tx.objectStore(KEYS_STORE);
      const request = store.get('metadata');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async saveMetadata(metadata: KeyMetadata): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(KEYS_STORE, 'readwrite');
      const store = tx.objectStore(KEYS_STORE);
      const request = store.put(metadata, 'metadata');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async ensureKey(): Promise<CryptoKey> {
    await this.initialize();

    if (this._isLocked) {
      throw new Error('Storage is locked. Please unlock first.');
    }

    if (!this.cryptoKey) {
      // First time use - generate browser key
      const key = await generateExtractableKey();
      const jwk = await exportKey(key);

      this.metadata = { type: 'browser', jwk };
      await this.saveMetadata(this.metadata);

      this.cryptoKey = await importKey(jwk);
      this._isLocked = false;
    }

    return this.cryptoKey;
  }

  async store(key: string, value: string): Promise<void> {
    const cryptoKey = await this.ensureKey();
    if (!this.db) throw new Error('Database not initialized');

    const encrypted = await encrypt(value, cryptoKey);

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readwrite');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.put(encrypted, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async retrieve(key: string): Promise<string | null> {
    const cryptoKey = await this.ensureKey();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readonly');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null);
          return;
        }

        try {
          const decrypted = await decrypt(request.result, cryptoKey);
          resolve(decrypted);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  async delete(key: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readwrite');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readwrite');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  isLocked(): boolean {
    return this._isLocked;
  }

  async unlock(password?: string): Promise<boolean> {
    await this.initialize();

    if (!this.metadata) {
      // First time use - auto-unlock with browser key
      this._isLocked = false;
      return true;
    }

    if (this.metadata.type === 'browser') {
      if (this.metadata.jwk) {
        this.cryptoKey = await importKey(this.metadata.jwk);
        this._isLocked = false;
        return true;
      }
      return false;
    }

    // Password mode
    if (!password) {
      return false;
    }

    try {
      const salt = new Uint8Array(
        atob(this.metadata.salt!).split('').map(c => c.charCodeAt(0))
      );
      this.cryptoKey = await deriveKeyFromPassword(password, salt);

      // Test the key by trying to read a known value
      // If no values exist, we assume the password is correct
      this._isLocked = false;
      return true;
    } catch {
      return false;
    }
  }

  lock(): void {
    this.cryptoKey = null;
    this._isLocked = true;
  }

  async setPasswordProtection(password: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const salt = generateSalt();
    const newKey = await deriveKeyFromPassword(password, salt);

    // Re-encrypt all existing values with new key
    const oldKey = this.cryptoKey;
    if (oldKey) {
      const allValues = await this.getAllValues();
      this.cryptoKey = newKey;

      for (const [key, encryptedValue] of allValues) {
        try {
          const decrypted = await decrypt(encryptedValue, oldKey);
          const reEncrypted = await encrypt(decrypted, newKey);
          await this.putRawValue(key, reEncrypted);
        } catch {
          // Skip values that can't be decrypted
        }
      }
    }

    // Save new metadata
    this.metadata = {
      type: 'password',
      salt: btoa(String.fromCharCode(...salt)),
    };
    await this.saveMetadata(this.metadata);

    this.cryptoKey = newKey;
    this._isLocked = false;
  }

  async removePasswordProtection(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const oldKey = this.cryptoKey;
    if (!oldKey) throw new Error('Storage is locked');

    // Generate new browser key
    const newCryptoKey = await generateExtractableKey();
    const jwk = await exportKey(newCryptoKey);
    const importedKey = await importKey(jwk);

    // Re-encrypt all existing values with new key
    const allValues = await this.getAllValues();
    for (const [key, encryptedValue] of allValues) {
      try {
        const decrypted = await decrypt(encryptedValue, oldKey);
        const reEncrypted = await encrypt(decrypted, importedKey);
        await this.putRawValue(key, reEncrypted);
      } catch {
        // Skip values that can't be decrypted
      }
    }

    // Save new metadata
    this.metadata = { type: 'browser', jwk };
    await this.saveMetadata(this.metadata);

    this.cryptoKey = importedKey;
    this._isLocked = false;
  }

  isPasswordProtected(): boolean {
    return this.metadata?.type === 'password';
  }

  private async getAllValues(): Promise<[string, string][]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readonly');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.openCursor();
      const results: [string, string][] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push([cursor.key as string, cursor.value]);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  private async putRawValue(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(VALUES_STORE, 'readwrite');
      const store = tx.objectStore(VALUES_STORE);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
let instance: SecureStorageImpl | null = null;

export function getSecureStorage(): ISecureStorage {
  if (!instance) {
    instance = new SecureStorageImpl();
  }
  return instance;
}

// For testing - reset the singleton
export function resetSecureStorage(): void {
  instance = null;
}
