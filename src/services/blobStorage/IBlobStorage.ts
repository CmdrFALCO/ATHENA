/**
 * Interface for binary blob storage (IndexedDB)
 * Stores file content separately from SQLite metadata
 */
export interface IBlobStorage {
  /**
   * Store a file and return its storage key
   */
  store(file: File): Promise<string>;

  /**
   * Retrieve a blob by storage key
   */
  retrieve(key: string): Promise<Blob | null>;

  /**
   * Delete a blob by storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Get the size of a stored blob
   */
  getSize(key: string): Promise<number | null>;

  /**
   * Check if a blob exists
   */
  exists(key: string): Promise<boolean>;
}
