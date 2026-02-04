import type { Community, CommunityHierarchy, CommunityStats } from '@/modules/community/types';

export interface ICommunityAdapter {
  // Basic CRUD
  save(community: Community): Promise<void>;
  saveBatch(communities: Community[]): Promise<void>;
  get(id: string): Promise<Community | null>;
  getByLevel(level: number): Promise<Community[]>;
  getByEntityId(entityId: string): Promise<Community[]>;
  getChildren(parentId: string): Promise<Community[]>;
  getHierarchy(): Promise<CommunityHierarchy>;

  // Staleness management
  getStale(): Promise<Community[]>;
  getStats(): Promise<CommunityStats>;
  markStale(communityIds?: string[]): Promise<void>;
  markAllStale(): Promise<void>;

  // Summary updates
  updateSummary(
    id: string,
    summary: string,
    keywords: string[],
    embedding: number[],
  ): Promise<void>;

  // Deletion
  deleteAll(): Promise<void>;
  delete(id: string): Promise<void>;

  // Change tracking
  incrementChangeCount(): Promise<void>;
  getChangeCount(): Promise<number>;
  resetChangeCount(): Promise<void>;
}
