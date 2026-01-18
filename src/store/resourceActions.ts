import { resourceState$ } from './resourceState';
import type {
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
  ResourceType,
} from '@/shared/types/resources';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import { blobStorage } from '@/services/blobStorage';

// Adapter reference (set by component on mount)
let resourceAdapter: IResourceAdapter | null = null;

export function setResourceAdapter(adapter: IResourceAdapter): void {
  resourceAdapter = adapter;
}

/**
 * Load all resources from database into state
 */
export async function loadResources(): Promise<void> {
  if (!resourceAdapter) throw new Error('Resource adapter not initialized');

  resourceState$.isLoading.set(true);
  try {
    const resources = await resourceAdapter.getAll();
    const resourceMap: Record<string, Resource> = {};
    for (const resource of resources) {
      resourceMap[resource.id] = resource;
    }
    resourceState$.resources.set(resourceMap);
  } finally {
    resourceState$.isLoading.set(false);
  }
}

/**
 * Upload a file and create a resource record
 */
export async function uploadResource(
  file: File,
  options?: {
    userNotes?: string;
    positionX?: number;
    positionY?: number;
  }
): Promise<Resource> {
  if (!resourceAdapter) throw new Error('Resource adapter not initialized');

  // Determine resource type from MIME type
  const resourceType = getResourceTypeFromMime(file.type, file.name);

  // Store blob in IndexedDB
  resourceState$.uploadProgress.set(0);
  const storageKey = await blobStorage.store(file);
  resourceState$.uploadProgress.set(50);

  // Create resource record in SQLite
  const input: CreateResourceInput = {
    type: resourceType,
    name: file.name,
    mimeType: file.type,
    fileSize: file.size,
    storageType: 'blob',
    storageKey,
    userNotes: options?.userNotes,
    positionX: options?.positionX,
    positionY: options?.positionY,
  };

  const resource = await resourceAdapter.create(input);
  resourceState$.uploadProgress.set(100);

  // Add to state
  const resources = resourceState$.resources.get();
  resourceState$.resources.set({ ...resources, [resource.id]: resource });

  // Clear progress after brief delay
  setTimeout(() => resourceState$.uploadProgress.set(null), 500);

  return resource;
}

/**
 * Update a resource's metadata
 */
export async function updateResource(
  id: string,
  input: UpdateResourceInput
): Promise<Resource | null> {
  if (!resourceAdapter) throw new Error('Resource adapter not initialized');

  const updated = await resourceAdapter.update(id, input);
  if (updated) {
    const resources = resourceState$.resources.get();
    resourceState$.resources.set({ ...resources, [id]: updated });
  }
  return updated;
}

/**
 * Delete a resource (soft delete + remove blob)
 */
export async function deleteResource(id: string): Promise<void> {
  if (!resourceAdapter) throw new Error('Resource adapter not initialized');

  const resources = resourceState$.resources.get();
  const resource = resources[id];
  if (!resource) return;

  // Delete blob if exists
  if (resource.storageKey) {
    await blobStorage.delete(resource.storageKey);
  }

  // Soft delete in SQLite
  await resourceAdapter.delete(id);

  // Remove from state
  const newResources = { ...resources };
  delete newResources[id];
  resourceState$.resources.set(newResources);

  // Clear selection if this was selected
  if (resourceState$.selectedResourceId.peek() === id) {
    resourceState$.selectedResourceId.set(null);
  }
}

/**
 * Get blob data for a resource
 */
export async function getResourceBlob(id: string): Promise<Blob | null> {
  const resources = resourceState$.resources.get();
  const resource = resources[id];
  if (!resource?.storageKey) return null;
  return blobStorage.retrieve(resource.storageKey);
}

/**
 * Select a resource
 */
export function selectResource(id: string | null): void {
  resourceState$.selectedResourceId.set(id);
}

/**
 * Set resources directly (for initialization)
 */
export function setResources(resources: Resource[]): void {
  const resourceMap: Record<string, Resource> = {};
  for (const resource of resources) {
    resourceMap[resource.id] = resource;
  }
  resourceState$.resources.set(resourceMap);
}

/**
 * Add a single resource to state
 */
export function addResource(resource: Resource): void {
  const resources = resourceState$.resources.get();
  resourceState$.resources.set({ ...resources, [resource.id]: resource });
}

/**
 * Remove a resource from state
 */
export function removeResource(id: string): void {
  const resources = { ...resourceState$.resources.get() };
  delete resources[id];
  resourceState$.resources.set(resources);
}

/**
 * Set loading state
 */
export function setResourcesLoading(loading: boolean): void {
  resourceState$.isLoading.set(loading);
}

// Helper: Map MIME type to ResourceType
function getResourceTypeFromMime(mimeType: string, fileName: string): ResourceType {
  // Check MIME type first
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return 'docx';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return 'xlsx';
  if (mimeType === 'application/vnd.ms-excel') return 'xlsx';
  if (mimeType === 'text/markdown') return 'md';
  if (mimeType.startsWith('image/')) return 'image';

  // Fall back to extension
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'xlsx':
    case 'xls':
      return 'xlsx';
    case 'md':
    case 'markdown':
      return 'md';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'image';
    default:
      return 'pdf'; // Default fallback
  }
}

// Export actions object for consistency with existing patterns
export const resourceActions = {
  setResources,
  addResource,
  removeResource,
  setLoading: setResourcesLoading,
  selectResource,
};
