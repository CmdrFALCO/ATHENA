import type { Resource, ResourceType, CreateResourceInput, UpdateResourceInput } from '@/shared/types/resources';

export interface IResourceAdapter {
  // CRUD
  create(input: CreateResourceInput): Promise<Resource>;
  getById(id: string): Promise<Resource | null>;
  getAll(): Promise<Resource[]>;
  update(id: string, input: UpdateResourceInput): Promise<Resource | null>;
  delete(id: string): Promise<void>; // Soft delete via invalid_at

  // Queries
  getByType(type: ResourceType): Promise<Resource[]>;
  getPendingExtraction(): Promise<Resource[]>;

  // Position (for canvas)
  updatePosition(id: string, x: number, y: number): Promise<void>;

  // Structure (WP 8.2 - document tree)
  updateStructure(id: string, structure: string | null): Promise<void>;
}
