import { observable } from '@legendapp/state';
import type { Resource } from '@/shared/types/resources';

export interface ResourceState {
  resources: Record<string, Resource>; // Keyed by ID
  selectedResourceId: string | null;
  isLoading: boolean;
  uploadProgress: number | null; // 0-100 during upload, null when not uploading
}

export const resourceState$ = observable<ResourceState>({
  resources: {},
  selectedResourceId: null,
  isLoading: false,
  uploadProgress: null,
});

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_RESOURCE_STATE__: typeof resourceState$ }).__ATHENA_RESOURCE_STATE__ = resourceState$;
}
