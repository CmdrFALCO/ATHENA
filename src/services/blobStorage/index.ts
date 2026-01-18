export type { IBlobStorage } from './IBlobStorage';
export { BlobStorageService } from './BlobStorageService';

// Singleton instance
import { BlobStorageService } from './BlobStorageService';
export const blobStorage = new BlobStorageService();
