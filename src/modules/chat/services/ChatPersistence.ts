import type { ChatThread, ChatMessage } from '../types';

const DB_NAME = 'athena-chat';
const DB_VERSION = 1;
const THREADS_STORE = 'threads';
const MESSAGES_STORE = 'messages';

/**
 * IndexedDB-based persistence for chat threads and messages
 * WP 7.1 - Chat UI & State
 *
 * Storage format:
 * - threads store: { id, title, contextNodeIds, createdAt, updatedAt }
 * - messages store: { id, threadId, role, content, proposals?, createdAt }
 */
class ChatPersistenceService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Threads store
        if (!db.objectStoreNames.contains(THREADS_STORE)) {
          const threadStore = db.createObjectStore(THREADS_STORE, { keyPath: 'id' });
          threadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          msgStore.createIndex('threadId', 'threadId', { unique: false });
          msgStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  async saveThread(thread: ChatThread): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readwrite');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.put(thread);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadAllThreads(): Promise<ChatThread[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readonly');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async loadAllMessages(): Promise<ChatMessage[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async loadMessagesForThread(threadId: string): Promise<ChatMessage[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('threadId');
      const request = index.getAll(IDBKeyRange.only(threadId));

      request.onsuccess = () => {
        const messages = request.result as ChatMessage[];
        // Sort by createdAt
        messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE, MESSAGES_STORE], 'readwrite');

      // Delete thread
      const threadStore = transaction.objectStore(THREADS_STORE);
      threadStore.delete(threadId);

      // Delete all messages in thread
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      const index = msgStore.index('threadId');
      const request = index.openCursor(IDBKeyRange.only(threadId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          msgStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const chatPersistence = new ChatPersistenceService();
