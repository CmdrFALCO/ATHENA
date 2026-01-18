// Resource Types for WP 6.1

export type ResourceType = 'pdf' | 'docx' | 'xlsx' | 'md' | 'image' | 'url';
export type StorageType = 'inline' | 'blob' | 'url';
export type ExtractionStatus = 'pending' | 'complete' | 'failed' | 'skipped';
export type ExtractionMethod = 'browser' | 'ai' | 'server';
export type UrlMode = 'reference' | 'extracted';

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  mimeType?: string;
  fileSize?: number;

  storageType: StorageType;
  storageKey?: string; // For 'blob' storage - IndexedDB key

  userNotes?: string; // User's annotations
  extractedText?: string; // Text extracted from content
  extractionStatus: ExtractionStatus;
  extractionMethod?: ExtractionMethod;

  url?: string; // For URL resources
  urlMode?: UrlMode; // 'reference' or 'extracted'

  positionX?: number; // Canvas position
  positionY?: number;

  createdAt: string;
  updatedAt: string;
  validAt: string; // Bi-temporal: when became valid
  invalidAt?: string; // Bi-temporal: soft delete
}

// Input for creating new resources
export interface CreateResourceInput {
  type: ResourceType;
  name: string;
  mimeType?: string;
  fileSize?: number;
  storageType: StorageType;
  storageKey?: string;
  userNotes?: string;
  url?: string;
  urlMode?: UrlMode;
  positionX?: number;
  positionY?: number;
}

// Input for updating resources
export interface UpdateResourceInput {
  name?: string;
  userNotes?: string;
  extractedText?: string;
  extractionStatus?: ExtractionStatus;
  extractionMethod?: ExtractionMethod;
  positionX?: number;
  positionY?: number;
}
