import type { DatabaseConnection } from '@/database/init';
import type { ICommunityAdapter } from '../ICommunityAdapter';
import type { Community, CommunityHierarchy, CommunityStats } from '@/modules/community/types';

// In-memory change counter (persisted across detection cycles within a session)
let changesSinceDetection = 0;

export class SQLiteCommunityAdapter implements ICommunityAdapter {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async save(community: Community): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO communities
        (id, level, parent_community_id, summary, keywords, embedding, algorithm, modularity, color, stale, created_at, last_refreshed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        community.id,
        community.level,
        community.parentCommunityId,
        community.summary,
        JSON.stringify(community.keywords),
        community.embedding ? this.serializeEmbedding(community.embedding) : null,
        community.algorithm,
        community.modularity,
        community.color,
        community.stale ? 1 : 0,
        community.createdAt,
        community.lastRefreshedAt,
      ],
    );

    // Save member relationships
    for (const entityId of community.memberEntityIds) {
      await this.db.run(
        'INSERT OR IGNORE INTO community_members (community_id, entity_id) VALUES (?, ?)',
        [community.id, entityId],
      );
    }
  }

  async saveBatch(communities: Community[]): Promise<void> {
    await this.db.run('BEGIN TRANSACTION');
    try {
      for (const community of communities) {
        await this.save(community);
      }
      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async get(id: string): Promise<Community | null> {
    const rows = await this.db.exec<Record<string, unknown>>(
      'SELECT * FROM communities WHERE id = ?',
      [id],
    );
    if (rows.length === 0) return null;

    return this.mapToCommunity(rows[0]);
  }

  async getByLevel(level: number): Promise<Community[]> {
    const rows = await this.db.exec<Record<string, unknown>>(
      'SELECT * FROM communities WHERE level = ? ORDER BY modularity DESC',
      [level],
    );
    return Promise.all(rows.map((row) => this.mapToCommunity(row)));
  }

  async getByEntityId(entityId: string): Promise<Community[]> {
    const rows = await this.db.exec<Record<string, unknown>>(
      `SELECT c.* FROM communities c
       INNER JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.entity_id = ?
       ORDER BY c.level ASC`,
      [entityId],
    );
    return Promise.all(rows.map((row) => this.mapToCommunity(row)));
  }

  async getChildren(parentId: string): Promise<Community[]> {
    const rows = await this.db.exec<Record<string, unknown>>(
      'SELECT * FROM communities WHERE parent_community_id = ? ORDER BY modularity DESC',
      [parentId],
    );
    return Promise.all(rows.map((row) => this.mapToCommunity(row)));
  }

  async getHierarchy(): Promise<CommunityHierarchy> {
    const allRows = await this.db.exec<Record<string, unknown>>(
      'SELECT * FROM communities ORDER BY level DESC, modularity DESC',
    );

    const allCommunities = await Promise.all(
      allRows.map((row) => this.mapToCommunity(row)),
    );

    // Build levels map
    const levels = new Map<number, Community[]>();
    for (const c of allCommunities) {
      const levelList = levels.get(c.level) || [];
      levelList.push(c);
      levels.set(c.level, levelList);
    }

    // Find roots (highest level or no parent)
    const maxLevel = allCommunities.length > 0
      ? Math.max(...allCommunities.map((c) => c.level))
      : 0;
    const roots = allCommunities.filter(
      (c) => c.level === maxLevel || c.parentCommunityId === null,
    );
    // Deduplicate: if a community is at max level, it's a root regardless of parent
    const rootIds = new Set<string>();
    const uniqueRoots: Community[] = [];
    for (const r of roots) {
      if (!rootIds.has(r.id)) {
        rootIds.add(r.id);
        uniqueRoots.push(r);
      }
    }

    // Build entity → communities map
    const entityToCommunities = new Map<string, string[]>();
    for (const c of allCommunities) {
      for (const entityId of c.memberEntityIds) {
        const existing = entityToCommunities.get(entityId) || [];
        existing.push(c.id);
        entityToCommunities.set(entityId, existing);
      }
    }

    return {
      roots: uniqueRoots,
      levels,
      entityToCommunities,
    };
  }

  async getStale(): Promise<Community[]> {
    const rows = await this.db.exec<Record<string, unknown>>(
      'SELECT * FROM communities WHERE stale = 1',
    );
    return Promise.all(rows.map((row) => this.mapToCommunity(row)));
  }

  async getStats(): Promise<CommunityStats> {
    const countResult = await this.db.exec<{ total: number }>(
      'SELECT COUNT(*) as total FROM communities',
    );
    const totalCommunities = countResult[0]?.total ?? 0;

    if (totalCommunities === 0) {
      return {
        totalCommunities: 0,
        levels: 0,
        largestCommunity: 0,
        smallestCommunity: 0,
        averageSize: 0,
        staleCount: 0,
        changesSinceDetection,
        lastDetectedAt: null,
      };
    }

    const levelResult = await this.db.exec<{ maxLevel: number }>(
      'SELECT MAX(level) as maxLevel FROM communities',
    );

    const sizeResult = await this.db.exec<{
      maxSize: number;
      minSize: number;
      avgSize: number;
    }>(
      `SELECT
        MAX(cnt) as maxSize,
        MIN(cnt) as minSize,
        AVG(cnt) as avgSize
       FROM (
         SELECT community_id, COUNT(*) as cnt
         FROM community_members
         GROUP BY community_id
       )`,
    );

    const staleResult = await this.db.exec<{ staleCount: number }>(
      'SELECT COUNT(*) as staleCount FROM communities WHERE stale = 1',
    );

    const dateResult = await this.db.exec<{ lastDate: string }>(
      'SELECT MAX(created_at) as lastDate FROM communities',
    );

    return {
      totalCommunities,
      levels: (levelResult[0]?.maxLevel ?? 0) + 1,
      largestCommunity: sizeResult[0]?.maxSize ?? 0,
      smallestCommunity: sizeResult[0]?.minSize ?? 0,
      averageSize: Math.round((sizeResult[0]?.avgSize ?? 0) * 10) / 10,
      staleCount: staleResult[0]?.staleCount ?? 0,
      changesSinceDetection,
      lastDetectedAt: dateResult[0]?.lastDate ?? null,
    };
  }

  async markStale(communityIds?: string[]): Promise<void> {
    if (communityIds && communityIds.length > 0) {
      const placeholders = communityIds.map(() => '?').join(',');
      await this.db.run(
        `UPDATE communities SET stale = 1 WHERE id IN (${placeholders})`,
        communityIds,
      );
    } else {
      await this.markAllStale();
    }
  }

  async markAllStale(): Promise<void> {
    await this.db.run('UPDATE communities SET stale = 1');
  }

  async updateSummary(
    id: string,
    summary: string,
    keywords: string[],
    embedding: number[],
  ): Promise<void> {
    await this.db.run(
      `UPDATE communities
       SET summary = ?, keywords = ?, embedding = ?, last_refreshed_at = ?, stale = 0
       WHERE id = ?`,
      [
        summary,
        JSON.stringify(keywords),
        this.serializeEmbedding(embedding),
        new Date().toISOString(),
        id,
      ],
    );
  }

  async deleteAll(): Promise<void> {
    await this.db.run('DELETE FROM community_members');
    await this.db.run('DELETE FROM communities');
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM community_members WHERE community_id = ?', [id]);
    await this.db.run('DELETE FROM communities WHERE id = ?', [id]);
  }

  async incrementChangeCount(): Promise<void> {
    changesSinceDetection++;
  }

  async getChangeCount(): Promise<number> {
    return changesSinceDetection;
  }

  async resetChangeCount(): Promise<void> {
    changesSinceDetection = 0;
  }

  // ============================================
  // Private helpers
  // ============================================

  private async mapToCommunity(row: Record<string, unknown>): Promise<Community> {
    const id = row.id as string;

    // Get member entity IDs
    const members = await this.db.exec<{ entity_id: string }>(
      'SELECT entity_id FROM community_members WHERE community_id = ?',
      [id],
    );
    const memberEntityIds = members.map((m) => m.entity_id);

    // Get child community IDs
    const children = await this.db.exec<{ id: string }>(
      'SELECT id FROM communities WHERE parent_community_id = ?',
      [id],
    );
    const childCommunityIds = children.map((c) => c.id);

    return {
      id,
      level: row.level as number,
      parentCommunityId: (row.parent_community_id as string) ?? null,
      childCommunityIds,
      memberEntityIds,
      memberCount: memberEntityIds.length,
      summary: (row.summary as string) ?? null,
      keywords: this.parseKeywords(row.keywords as string | null),
      embedding: this.deserializeEmbedding(row.embedding as ArrayBuffer | null),
      algorithm: row.algorithm as 'louvain' | 'leiden',
      modularity: (row.modularity as number) ?? 0,
      color: row.color as string,
      stale: (row.stale as number) === 1,
      createdAt: row.created_at as string,
      lastRefreshedAt: row.last_refreshed_at as string,
    };
  }

  private parseKeywords(value: string | null): string[] {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  private serializeEmbedding(embedding: number[]): Uint8Array {
    const float32 = new Float32Array(embedding);
    return new Uint8Array(float32.buffer);
  }

  private deserializeEmbedding(buffer: ArrayBuffer | null): number[] | null {
    if (!buffer) return null;
    try {
      const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const float32 = new Float32Array(uint8.buffer, uint8.byteOffset, uint8.byteLength / 4);
      return Array.from(float32);
    } catch {
      return null;
    }
  }
}
